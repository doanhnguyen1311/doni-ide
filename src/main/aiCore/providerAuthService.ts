import crypto from 'node:crypto';
import type {
  AiProviderAccount,
  CancelProviderAuthRequest,
  GetProviderAuthMetadataRequest,
  PollProviderAuthRequest,
  ProviderAuthFlowResponse,
  ProviderAuthMetadataResponse,
  RefreshProviderAccountRequest,
  RefreshProviderAccountResponse,
  StartProviderAuthRequest,
} from '../../shared/types';
import { DEFAULT_VISIBLE_MODELS } from '../../shared/modelCatalog';
import type { AiSettings } from '../../shared/types';
import { getAiSettings, saveAiSettings } from '../aiSettingsService';
import {
  type AuthFlowSession,
  createAuthFlowSession,
  deleteAuthFlowSession,
  getAuthFlowSession,
  getAuthFlowSessionByProviderFlow,
  getAuthFlowSessionByState,
  updateAuthFlowSession,
} from './authFlowSessionStore';
import { listConfiguredAccounts } from './accountManager';
import { listAuthMethods } from './authMethodRegistry';
import type { InternalAuthAdapterResult } from './authAdapterResults';
import { getDeviceCodeAdapter } from './deviceCodeAdapterRegistry';
import { getOAuthPkceAdapter } from './oauthAdapterRegistry';
import { getGeminiOAuthClientId, getGeminiOAuthClientSecret } from './oauthConfig';
import { type OAuthLoopbackCloseReason, startOAuthLoopbackServer } from './oauthLoopbackServer';
import { createOAuthState, createPkceChallenge, createPkceVerifier } from './pkce';
import { getProviderDefinition } from './providerRegistry';
import { checkAccountRefreshState, refreshProviderAccountSkeleton } from './refreshManager';
import { createSecretReference, readSecret, writeSecret } from './secretStore';

const OAUTH_SESSION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_GEMINI_MODEL_IDS = DEFAULT_VISIBLE_MODELS.gemini;
const loopbackClosers = new Map<string, (reason?: OAuthLoopbackCloseReason) => void>();
const terminalAuthResults = new Map<string, ProviderAuthFlowResponse>();

function rememberTerminalAuthResult(response: ProviderAuthFlowResponse): void {
  if (response.sessionId) {
    terminalAuthResults.set(response.sessionId, response);
  }
}

function takeTerminalAuthResult(sessionId: string): ProviderAuthFlowResponse | undefined {
  const response = terminalAuthResults.get(sessionId);
  if (response) {
    terminalAuthResults.delete(sessionId);
  }
  return response;
}

function clearAuthSession(sessionId: string, response?: ProviderAuthFlowResponse): void {
  updateAuthFlowSession(sessionId, { verifier: undefined });
  deleteAuthFlowSession(sessionId);
  if (response) {
    rememberTerminalAuthResult(response);
  }
}

function closeLoopbackForSession(sessionId: string, reason: OAuthLoopbackCloseReason = 'completed'): void {
  const close = loopbackClosers.get(sessionId);
  if (!close) return;
  loopbackClosers.delete(sessionId);
  close(reason);
}

function notImplementedResponse(request: StartProviderAuthRequest | PollProviderAuthRequest | { sessionId: string }): ProviderAuthFlowResponse {
  const session = 'sessionId' in request ? getAuthFlowSession(request.sessionId) : undefined;
  return {
    ok: false,
    status: 'not_implemented',
    providerId: 'providerId' in request ? request.providerId : session?.providerId,
    authMethod: 'authMethod' in request ? request.authMethod : session?.authMethod,
    sessionId: 'sessionId' in request ? request.sessionId : undefined,
    expiresAt: session?.expiresAt,
    message: 'This provider auth flow is not implemented yet.',
  };
}

function secretPrefix(providerId: string, suffix: string): string {
  return `secret_ref_${providerId.replace(/[^a-z0-9]+/gi, '_')}_${suffix}`;
}

function isInternalAuthSuccess(result: ProviderAuthFlowResponse | InternalAuthAdapterResult): result is Extract<InternalAuthAdapterResult, { ok: true }> {
  return result.ok === true && 'account' in result;
}

async function startDeviceCodeAuth(request: StartProviderAuthRequest): Promise<ProviderAuthFlowResponse> {
  const adapter = getDeviceCodeAdapter(request.providerId);
  if (!adapter) return notImplementedResponse(request);

  const start = await adapter.startDeviceCode(request);
  if (!start.ok || !('deviceCode' in start)) {
    return start as ProviderAuthFlowResponse;
  }

  const ttlMs = Math.max(60, start.expiresInSeconds ?? OAUTH_SESSION_TTL_MS / 1000) * 1000;
  const session = createAuthFlowSession({
    providerId: request.providerId,
    authMethod: 'deviceCode',
    accountId: request.accountId,
    clientId: start.clientId,
    scopes: start.scopes ?? request.scopes,
    device: {
      deviceCode: start.deviceCode,
      userCode: start.userCode,
      verificationUri: start.verificationUri,
      verificationUriComplete: start.verificationUriComplete,
      intervalSeconds: start.intervalSeconds,
    },
    ttlMs,
  });
  const authorizationUrl = start.verificationUriComplete ?? start.verificationUri;
  return {
    ok: true,
    status: 'started',
    providerId: request.providerId,
    authMethod: 'deviceCode',
    sessionId: session.id,
    authorizationUrl,
    verificationUri: start.verificationUri,
    verificationUriComplete: start.verificationUriComplete,
    userCode: start.userCode,
    expiresAt: session.expiresAt,
    intervalSeconds: start.intervalSeconds,
    message: start.message ?? 'Device-code authorization started.',
  };
}

export function listAiAuthMethods() {
  return listAuthMethods();
}

export function getProviderAuthMetadata(request: GetProviderAuthMetadataRequest): ProviderAuthMetadataResponse {
  const provider = getProviderDefinition(request.providerId);
  if (!provider) {
    return {
      providerId: request.providerId,
      known: false,
      errorCode: 'unknown_provider',
      message: 'Unknown provider.',
      authMethods: [],
    };
  }
  return {
    providerId: request.providerId,
    known: true,
    authMethods: provider.authMethods ?? [],
  };
}

export async function startProviderAuth(request: StartProviderAuthRequest): Promise<ProviderAuthFlowResponse> {
  const provider = getProviderDefinition(request.providerId);
  if (!provider) {
    return {
      ok: false,
      status: 'error',
      providerId: request.providerId,
      authMethod: request.authMethod,
      message: 'Unknown provider.',
    };
  }

  const method = provider.authMethods?.find((item) => item.id === request.authMethod);
  if (!method) {
    return {
      ok: false,
      status: 'error',
      providerId: request.providerId,
      authMethod: request.authMethod,
      message: 'Provider does not support this auth method.',
    };
  }

  if (request.authMethod === 'apiKey' || request.authMethod === 'localNoAuth') {
    return {
      ok: true,
      status: 'not_required',
      providerId: request.providerId,
      authMethod: request.authMethod,
      message: 'This auth method does not require an interactive login flow.',
    };
  }

  if (request.authMethod === 'deviceCode') {
    return startDeviceCodeAuth(request);
  }

  if (request.authMethod !== 'oauthPkce') {
    return notImplementedResponse(request);
  }

  const adapter = getOAuthPkceAdapter(request.providerId);
  if (!adapter) {
    return notImplementedResponse(request);
  }
  const clientId = request.providerId === 'gemini' ? getGeminiOAuthClientId(request.clientId) : request.clientId?.trim();
  const clientSecret = request.providerId === 'gemini' ? getGeminiOAuthClientSecret(request.clientSecret) : request.clientSecret?.trim();
  if (method.requiresClientId && !clientId) {
    return {
      ok: false,
      status: 'error',
      providerId: request.providerId,
      authMethod: request.authMethod,
      message: 'OAuth client ID is required for this provider.',
    };
  }

  const verifier = createPkceVerifier();
  const codeChallenge = createPkceChallenge(verifier);
  const state = createOAuthState();
  let loopbackSessionId: string | undefined;
  const loopback = await startOAuthLoopbackServer({
    providerId: request.providerId,
    authMethod: request.authMethod,
    ttlMs: OAUTH_SESSION_TTL_MS,
    onCallback: completeProviderAuthCallback,
    onClose: (reason) => {
      if (loopbackSessionId) {
        loopbackClosers.delete(loopbackSessionId);
        if (reason === 'timeout') {
          const expiredSession = getAuthFlowSession(loopbackSessionId);
          if (expiredSession) {
            clearAuthSession(loopbackSessionId, {
              ok: false,
              status: 'expired',
              providerId: expiredSession.providerId,
              authMethod: expiredSession.authMethod,
              sessionId: expiredSession.id,
              message: 'Auth session expired before browser sign-in completed.',
            });
          }
        }
      }
    },
  });
  const session = createAuthFlowSession({
    providerId: request.providerId,
    authMethod: request.authMethod,
    accountId: request.accountId,
    clientId,
    clientSecret,
    state,
    verifier,
    redirectUri: loopback.redirectUri,
    scopes: request.scopes,
    ttlMs: OAUTH_SESSION_TTL_MS,
  });
  loopbackSessionId = session.id;
  loopbackClosers.set(session.id, loopback.close);
  const response = await adapter.startAuth({
    ...request,
    clientId: clientId ?? '',
    redirectUri: loopback.redirectUri,
    state,
    codeChallenge,
  });
  if (!response.ok || !response.authorizationUrl) {
    closeLoopbackForSession(session.id);
    clearAuthSession(session.id);
    return response;
  }

  return {
    ...response,
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}

async function persistOAuthResult(
  settings: AiSettings,
  session: AuthFlowSession,
  result: InternalAuthAdapterResult,
): Promise<ProviderAuthFlowResponse> {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      message: result.message,
    };
  }

  const accounts = [...(settings.accounts ?? [])];
  const externalAccountId = result.account.externalAccountId;
  const matchingOAuthIndex = accounts.findIndex((account) => {
    if (account.providerId !== session.providerId || account.authMethod !== session.authMethod) return false;
    if (externalAccountId) {
      return (
        account.metadata?.externalAccountId === externalAccountId ||
        String(account.metadata?.githubUserId ?? '') === externalAccountId ||
        account.metadata?.githubLogin === externalAccountId
      );
    }
    return !session.clientId || account.authState?.clientId === session.clientId;
  });
  const existingIndex = session.accountId ? accounts.findIndex((account) => account.id === session.accountId) : matchingOAuthIndex;
  const existing = existingIndex >= 0 ? accounts[existingIndex] : undefined;
  const accessTokenReference =
    existing?.credentialReferences?.accessToken ??
    result.account.credentialReferences?.accessToken ??
    createSecretReference(secretPrefix(session.providerId, 'access'));
  const refreshTokenReference =
    result.credentialMaterial?.refreshToken || existing?.credentialReferences?.refreshToken
      ? (existing?.credentialReferences?.refreshToken ?? result.account.credentialReferences?.refreshToken ?? createSecretReference(secretPrefix(session.providerId, 'refresh')))
      : undefined;
  const copilotTokenReference =
    result.credentialMaterial?.copilotToken || existing?.credentialReferences?.copilotToken
      ? (existing?.credentialReferences?.copilotToken ?? result.account.credentialReferences?.copilotToken ?? createSecretReference(secretPrefix(session.providerId, 'copilot')))
      : undefined;
  const clientSecretReference =
    session.clientSecret || existing?.credentialReferences?.oauthClientSecret
      ? (existing?.credentialReferences?.oauthClientSecret ?? createSecretReference(secretPrefix(session.providerId, 'client_secret')))
      : undefined;

  if (result.credentialMaterial?.accessToken) {
    await writeSecret(accessTokenReference, result.credentialMaterial.accessToken);
  }
  if (refreshTokenReference && result.credentialMaterial?.refreshToken) {
    await writeSecret(refreshTokenReference, result.credentialMaterial.refreshToken);
  }
  if (copilotTokenReference && result.credentialMaterial?.copilotToken) {
    await writeSecret(copilotTokenReference, result.credentialMaterial.copilotToken);
  }
  if (clientSecretReference && session.clientSecret) {
    await writeSecret(clientSecretReference, session.clientSecret);
  }

  const defaultModelIds = session.providerId === 'gemini' ? DEFAULT_GEMINI_MODEL_IDS : [];
  const modelIds = existing?.modelIds?.length ? existing.modelIds : defaultModelIds;
  const firstModel = modelIds[0];
  const account: AiProviderAccount = {
    ...(existing ?? {
      id: session.accountId ?? `account_${crypto.randomUUID()}`,
      status: 'active',
      priority: 100,
      healthScore: 1,
    }),
    providerId: session.providerId,
    displayName: existing?.displayName || result.account.displayName || session.providerId,
    authMethod: session.authMethod,
    credentialReferences: {
      ...existing?.credentialReferences,
      accessToken: accessTokenReference,
      ...(refreshTokenReference ? { refreshToken: refreshTokenReference } : {}),
      ...(copilotTokenReference ? { copilotToken: copilotTokenReference } : {}),
      ...(clientSecretReference ? { oauthClientSecret: clientSecretReference } : {}),
    },
    authState: {
      ...existing?.authState,
      ...result.account.authState,
      configured: true,
      clientId: session.clientId,
      scopes: result.account.authState?.scopes ?? session.scopes,
    },
    metadata: {
      ...existing?.metadata,
      ...result.account.metadata,
      ...(externalAccountId ? { externalAccountId } : {}),
    },
    modelIds,
    apiBase: existing?.apiBase,
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  const saved = await saveAiSettings({
    ...settings,
    accounts,
    selectedAccountId: settings.selectedAccountId || account.id,
    model: settings.model || firstModel || '',
    plannerModel: settings.plannerModel || firstModel || '',
    executorModel: settings.executorModel || firstModel || '',
    plannerModelSelection:
      settings.plannerModelSelection ??
      (firstModel ? { providerId: account.providerId, accountId: account.id, modelId: firstModel } : undefined),
    executorModelSelection:
      settings.executorModelSelection ??
      (firstModel ? { providerId: account.providerId, accountId: account.id, modelId: firstModel } : undefined),
    customModels: Array.from(new Set([...settings.customModels, ...modelIds].filter(Boolean))),
  });
  const savedAccount = saved.accounts?.find((item) => item.id === account.id) ?? account;

  return {
    ok: true,
    status: 'completed',
    providerId: savedAccount.providerId,
    authMethod: savedAccount.authMethod,
    sessionId: session.id,
    accountId: savedAccount.id,
    accountDisplayName: savedAccount.displayName,
    expiresAt: savedAccount.authState?.expiresAt,
    message: `${savedAccount.displayName} connected.`,
  };
}

async function exchangeOAuthCode(session: AuthFlowSession, code: string): Promise<ProviderAuthFlowResponse> {
  if (session.authMethod !== 'oauthPkce') {
    closeLoopbackForSession(session.id);
    clearAuthSession(session.id);
    return notImplementedResponse({ sessionId: session.id });
  }
  const adapter = getOAuthPkceAdapter(session.providerId);
  if (!adapter) {
    closeLoopbackForSession(session.id);
    clearAuthSession(session.id);
    return notImplementedResponse({ sessionId: session.id });
  }
  if (!session.redirectUri || (session.providerId === 'gemini' && (!session.verifier || !session.clientId))) {
    closeLoopbackForSession(session.id);
    const response: ProviderAuthFlowResponse = {
      ok: false,
      status: 'error',
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      message: 'OAuth session is missing required PKCE data.',
    };
    clearAuthSession(session.id, response);
    return response;
  }

  const result = await adapter.exchangeCode({
    sessionId: session.id,
    code,
    state: session.state,
    clientId: session.clientId ?? '',
    clientSecret: session.clientSecret,
    redirectUri: session.redirectUri,
    verifier: session.verifier ?? '',
    scopes: session.scopes,
  });
  const response = await persistOAuthResult(await getAiSettings(), session, result);
  clearAuthSession(session.id, response);
  closeLoopbackForSession(session.id);
  return response;
}

async function completeProviderAuthCallback(callback: {
  providerId?: string;
  authMethod?: AiProviderAccount['authMethod'];
  code?: string;
  state?: string;
  error?: string;
}): Promise<ProviderAuthFlowResponse> {
  const session = callback.state
    ? getAuthFlowSessionByState(callback.state)
    : callback.providerId && callback.authMethod
      ? getAuthFlowSessionByProviderFlow(callback.providerId, callback.authMethod)
      : undefined;
  if (!session) {
    return {
      ok: false,
      status: 'expired',
      message: 'Auth session was not found or has expired.',
    };
  }
  if (callback.error) {
    const response: ProviderAuthFlowResponse = {
      ok: false,
      status: callback.error === 'access_denied' ? 'denied' : 'error',
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      message: 'OAuth provider rejected the sign-in request.',
    };
    clearAuthSession(session.id, response);
    closeLoopbackForSession(session.id);
    return response;
  }
  if (!callback.code) {
    const response: ProviderAuthFlowResponse = {
      ok: false,
      status: 'error',
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      message: 'OAuth callback did not include an authorization code.',
    };
    clearAuthSession(session.id, response);
    closeLoopbackForSession(session.id);
    return response;
  }
  return exchangeOAuthCode(session, callback.code);
}

async function pollDeviceCodeAuth(session: AuthFlowSession): Promise<ProviderAuthFlowResponse> {
  const adapter = getDeviceCodeAdapter(session.providerId);
  if (!adapter) return notImplementedResponse({ sessionId: session.id });
  const deviceCode = session.device?.deviceCode;
  if (!deviceCode) {
    const response: ProviderAuthFlowResponse = {
      ok: false,
      status: 'error',
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      message: 'Device-code session is missing its provider device code.',
    };
    clearAuthSession(session.id, response);
    return response;
  }

  const result = await adapter.pollDeviceCode({
    sessionId: session.id,
    deviceCode,
  });

  if (isInternalAuthSuccess(result)) {
    const response = await persistOAuthResult(await getAiSettings(), session, result);
    clearAuthSession(session.id, response);
    return response;
  }

  if (!result.ok && !('providerId' in result)) {
    const response: ProviderAuthFlowResponse = {
      ok: false,
      status: result.status,
      providerId: session.providerId,
      authMethod: session.authMethod,
      sessionId: session.id,
      verificationUri: session.device?.verificationUri,
      verificationUriComplete: session.device?.verificationUriComplete,
      userCode: session.device?.userCode,
      expiresAt: session.expiresAt,
      intervalSeconds: session.device?.intervalSeconds,
      message: result.message,
    };
    if (result.status === 'expired' || result.status === 'denied' || result.status === 'error') {
      clearAuthSession(session.id, response);
    }
    return response;
  }

  const providerResponse = result as ProviderAuthFlowResponse;
  const nextIntervalSeconds =
    providerResponse.status === 'slow_down'
      ? Math.max((session.device?.intervalSeconds ?? 5) + 5, 10)
      : session.device?.intervalSeconds;
  if (nextIntervalSeconds !== session.device?.intervalSeconds) {
    updateAuthFlowSession(session.id, {
      device: {
        ...session.device,
        intervalSeconds: nextIntervalSeconds,
      },
    });
  }
  return {
    ...providerResponse,
    providerId: providerResponse.providerId ?? session.providerId,
    authMethod: providerResponse.authMethod ?? session.authMethod,
    sessionId: providerResponse.sessionId ?? session.id,
    verificationUri: session.device?.verificationUri,
    verificationUriComplete: session.device?.verificationUriComplete,
    userCode: session.device?.userCode,
    expiresAt: session.expiresAt,
    intervalSeconds: nextIntervalSeconds,
  };
}

export async function pollProviderAuth(request: PollProviderAuthRequest): Promise<ProviderAuthFlowResponse> {
  const terminalResult = takeTerminalAuthResult(request.sessionId);
  if (terminalResult) {
    return terminalResult;
  }
  const session = getAuthFlowSession(request.sessionId);
  if (!session) {
    return {
      ok: false,
      status: 'expired',
      sessionId: request.sessionId,
      message: 'Auth session was not found or has expired.',
    };
  }
  if (session.authMethod === 'deviceCode') {
    return pollDeviceCodeAuth(session);
  }
  return {
    ok: true,
    status: 'pending',
    providerId: session.providerId,
    authMethod: session.authMethod,
    sessionId: session.id,
    verificationUri: session.device?.verificationUri,
    userCode: session.device?.userCode,
    expiresAt: session.expiresAt,
    intervalSeconds: session.device?.intervalSeconds,
    message: 'Auth session is pending.',
  };
}

export async function cancelProviderAuth(request: CancelProviderAuthRequest): Promise<ProviderAuthFlowResponse> {
  const session = getAuthFlowSession(request.sessionId);
  closeLoopbackForSession(request.sessionId, 'cancelled');
  const response: ProviderAuthFlowResponse = {
    ok: true,
    status: 'cancelled',
    providerId: session?.providerId,
    authMethod: session?.authMethod,
    sessionId: request.sessionId,
    message: 'Auth session cancelled.',
  };
  clearAuthSession(request.sessionId, response);
  return response;
}

export async function refreshProviderAccount(settings: AiSettings, request: RefreshProviderAccountRequest): Promise<RefreshProviderAccountResponse> {
  const account = listConfiguredAccounts(settings).find((item) => item.id === request.accountId);
  if (!account) {
    return {
      ok: false,
      status: 'error',
      accountId: request.accountId,
      message: 'AI account was not found.',
    };
  }
  if (account.providerId === 'gemini' && account.authMethod === 'oauthPkce') {
    const refreshState = checkAccountRefreshState(account);
    if (!refreshState.refreshable || !refreshState.shouldRefresh) {
      return refreshProviderAccountSkeleton(account);
    }
    const adapter = getOAuthPkceAdapter('gemini');
    const refreshTokenReference = account.credentialReferences?.refreshToken;
    const clientId = account.authState?.clientId;
    const clientSecretReference = account.credentialReferences?.oauthClientSecret;
    if (!adapter || !refreshTokenReference || !clientId) {
      return refreshProviderAccountSkeleton(account);
    }
    const refreshToken = await readSecret(refreshTokenReference);
    const clientSecret = clientSecretReference
      ? await readSecret(clientSecretReference)
      : getGeminiOAuthClientSecret();
    const result = await adapter.refresh({
      account,
      clientId,
      clientSecret,
      refreshToken,
    });
    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        accountId: account.id,
        providerId: account.providerId,
        expiresAt: account.authState?.expiresAt,
        message: result.message,
      };
    }

    const accessTokenReference = account.credentialReferences?.accessToken ?? createSecretReference('secret_ref_gemini_access');
    if (result.credentialMaterial?.accessToken) {
      await writeSecret(accessTokenReference, result.credentialMaterial.accessToken);
    }
    let nextRefreshTokenReference = refreshTokenReference;
    if (result.credentialMaterial?.refreshToken) {
      nextRefreshTokenReference = account.credentialReferences?.refreshToken ?? createSecretReference('secret_ref_gemini_refresh');
      await writeSecret(nextRefreshTokenReference, result.credentialMaterial.refreshToken);
    }
    const accounts = (settings.accounts ?? []).map((item) =>
      item.id === account.id
        ? {
            ...item,
            credentialReferences: {
              ...item.credentialReferences,
              accessToken: accessTokenReference,
              refreshToken: nextRefreshTokenReference,
            },
            authState: {
              ...item.authState,
              ...result.account.authState,
              configured: true,
              refreshable: true,
              clientId,
            },
          }
        : item,
    );
    const saved = await saveAiSettings({ ...settings, accounts });
    const savedAccount = saved.accounts?.find((item) => item.id === account.id);
    return {
      ok: true,
      status: 'completed',
      accountId: account.id,
      providerId: account.providerId,
      expiresAt: savedAccount?.authState?.expiresAt,
      message: 'Gemini OAuth token refreshed.',
    };
  }
  if (account.authMethod === 'oauthPkce') {
    const refreshState = checkAccountRefreshState(account);
    if (!refreshState.refreshable || !refreshState.shouldRefresh) {
      return refreshProviderAccountSkeleton(account);
    }
    const adapter = getOAuthPkceAdapter(account.providerId);
    const refreshTokenReference = account.credentialReferences?.refreshToken;
    if (!adapter || !refreshTokenReference) {
      return refreshProviderAccountSkeleton(account);
    }
    const refreshToken = await readSecret(refreshTokenReference);
    const clientSecretReference = account.credentialReferences?.oauthClientSecret;
    const clientSecret = clientSecretReference ? await readSecret(clientSecretReference) : undefined;
    const result = await adapter.refresh({
      account,
      clientId: account.authState?.clientId ?? '',
      clientSecret,
      refreshToken,
    });
    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        accountId: account.id,
        providerId: account.providerId,
        expiresAt: account.authState?.expiresAt,
        message: result.message,
      };
    }

    const accessTokenReference =
      result.credentialMaterial?.accessToken
        ? (account.credentialReferences?.accessToken ?? createSecretReference(secretPrefix(account.providerId, 'access')))
        : account.credentialReferences?.accessToken;
    const nextRefreshTokenReference =
      result.credentialMaterial?.refreshToken
        ? (account.credentialReferences?.refreshToken ?? createSecretReference(secretPrefix(account.providerId, 'refresh')))
        : account.credentialReferences?.refreshToken;

    if (accessTokenReference && result.credentialMaterial?.accessToken) {
      await writeSecret(accessTokenReference, result.credentialMaterial.accessToken);
    }
    if (nextRefreshTokenReference && result.credentialMaterial?.refreshToken) {
      await writeSecret(nextRefreshTokenReference, result.credentialMaterial.refreshToken);
    }

    const accounts = (settings.accounts ?? []).map((item) =>
      item.id === account.id
        ? {
            ...item,
            displayName: result.account.displayName ?? item.displayName,
            credentialReferences: {
              ...item.credentialReferences,
              ...(accessTokenReference ? { accessToken: accessTokenReference } : {}),
              ...(nextRefreshTokenReference ? { refreshToken: nextRefreshTokenReference } : {}),
            },
            metadata: {
              ...item.metadata,
              ...result.account.metadata,
            },
            authState: {
              ...item.authState,
              ...result.account.authState,
              configured: true,
              lastRefreshAt: new Date().toISOString(),
            },
          }
        : item,
    );
    const saved = await saveAiSettings({ ...settings, accounts });
    const savedAccount = saved.accounts?.find((item) => item.id === account.id);
    return {
      ok: true,
      status: 'completed',
      accountId: account.id,
      providerId: account.providerId,
      expiresAt: savedAccount?.authState?.expiresAt,
      message: `${savedAccount?.displayName ?? account.displayName} refreshed.`,
    };
  }
  if (account.authMethod === 'deviceCode') {
    const adapter = getDeviceCodeAdapter(account.providerId);
    if (!adapter) return refreshProviderAccountSkeleton(account);
    const result = await adapter.refresh({ account });
    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        accountId: account.id,
        providerId: account.providerId,
        expiresAt: account.authState?.expiresAt,
        message: result.message,
      };
    }

    const accessTokenReference =
      result.credentialMaterial?.accessToken
        ? (account.credentialReferences?.accessToken ?? createSecretReference(secretPrefix(account.providerId, 'access')))
        : account.credentialReferences?.accessToken;
    const refreshTokenReference =
      result.credentialMaterial?.refreshToken
        ? (account.credentialReferences?.refreshToken ?? createSecretReference(secretPrefix(account.providerId, 'refresh')))
        : account.credentialReferences?.refreshToken;
    const copilotTokenReference =
      result.credentialMaterial?.copilotToken
        ? (account.credentialReferences?.copilotToken ?? createSecretReference(secretPrefix(account.providerId, 'copilot')))
        : account.credentialReferences?.copilotToken;

    if (accessTokenReference && result.credentialMaterial?.accessToken) {
      await writeSecret(accessTokenReference, result.credentialMaterial.accessToken);
    }
    if (refreshTokenReference && result.credentialMaterial?.refreshToken) {
      await writeSecret(refreshTokenReference, result.credentialMaterial.refreshToken);
    }
    if (copilotTokenReference && result.credentialMaterial?.copilotToken) {
      await writeSecret(copilotTokenReference, result.credentialMaterial.copilotToken);
    }

    const accounts = (settings.accounts ?? []).map((item) =>
      item.id === account.id
        ? {
            ...item,
            displayName: result.account.displayName ?? item.displayName,
            credentialReferences: {
              ...item.credentialReferences,
              ...(accessTokenReference ? { accessToken: accessTokenReference } : {}),
              ...(refreshTokenReference ? { refreshToken: refreshTokenReference } : {}),
              ...(copilotTokenReference ? { copilotToken: copilotTokenReference } : {}),
            },
            metadata: {
              ...item.metadata,
              ...result.account.metadata,
            },
            authState: {
              ...item.authState,
              ...result.account.authState,
              configured: true,
              lastRefreshAt: new Date().toISOString(),
            },
          }
        : item,
    );
    const saved = await saveAiSettings({ ...settings, accounts });
    const savedAccount = saved.accounts?.find((item) => item.id === account.id);
    return {
      ok: true,
      status: 'completed',
      accountId: account.id,
      providerId: account.providerId,
      expiresAt: savedAccount?.authState?.expiresAt,
      message: `${savedAccount?.displayName ?? account.displayName} refreshed.`,
    };
  }
  return refreshProviderAccountSkeleton(account);
}
