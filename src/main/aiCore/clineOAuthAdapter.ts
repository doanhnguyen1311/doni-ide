import type { ProviderAuthFlowResponse } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';
import type { OAuthPkceAuthAdapter, OAuthPkceCompleteRequest, OAuthPkceRefreshRequest, OAuthPkceStartRequest } from './oauthPkceAuthAdapter';

const CLINE_AUTHORIZE_URL = 'https://api.cline.bot/api/v1/auth/authorize';
const CLINE_TOKEN_URL = 'https://api.cline.bot/api/v1/auth/token';
const CLINE_REFRESH_URL = 'https://api.cline.bot/api/v1/auth/refresh';
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

interface ClineTokenData {
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  expiresAt?: string;
  userInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface ClineTokenPayload extends ClineTokenData {
  data?: ClineTokenData;
  error?: string;
  message?: string;
}

interface NormalizedClineTokens {
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  expiresAt?: string;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: 'invalid_response', message: text.slice(0, 200) } as T;
  }
}

function expiresAtFromNow(seconds = DEFAULT_EXPIRES_IN_SECONDS): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function normalizeExpiresAt(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function normalizeTokenPayload(payload: ClineTokenPayload): NormalizedClineTokens {
  const data = payload.data ?? payload;
  const userInfo = data.userInfo ?? payload.userInfo;
  return {
    accessToken: data.accessToken ?? payload.accessToken,
    refreshToken: data.refreshToken ?? payload.refreshToken,
    email: data.email ?? payload.email ?? userInfo?.email,
    firstName: data.firstName ?? payload.firstName ?? userInfo?.firstName,
    lastName: data.lastName ?? payload.lastName ?? userInfo?.lastName,
    expiresAt: data.expiresAt ?? payload.expiresAt,
  };
}

function isRefreshRequest(request: OAuthPkceCompleteRequest | OAuthPkceRefreshRequest): request is OAuthPkceRefreshRequest {
  return 'account' in request;
}

function decodeTokenFromCode(code: string): NormalizedClineTokens | undefined {
  try {
    let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const padding = 4 - (base64.length % 4);
    if (padding !== 4) base64 += '='.repeat(padding);
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const lastBrace = decoded.lastIndexOf('}');
    if (lastBrace === -1) return undefined;
    const tokenData = JSON.parse(decoded.slice(0, lastBrace + 1)) as ClineTokenPayload;
    return normalizeTokenPayload(tokenData);
  } catch {
    return undefined;
  }
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<NormalizedClineTokens> {
  const response = await fetch(CLINE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_type: 'extension',
      redirect_uri: redirectUri,
    }),
  });
  const data = await readJsonResponse<ClineTokenPayload>(response);
  if (!response.ok) {
    throw new Error(data.message || data.error || `Cline token exchange failed with HTTP ${response.status}.`);
  }
  return normalizeTokenPayload(data);
}

async function refreshToken(refreshToken: string): Promise<NormalizedClineTokens> {
  const response = await fetch(CLINE_REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      refreshToken,
      grantType: 'refresh_token',
      clientType: 'extension',
    }),
  });
  const data = await readJsonResponse<ClineTokenPayload>(response);
  if (!response.ok) {
    throw new Error(data.message || data.error || `Cline token refresh failed with HTTP ${response.status}.`);
  }
  return normalizeTokenPayload(data);
}

function mapSuccess(tokens: NormalizedClineTokens, request: OAuthPkceCompleteRequest | OAuthPkceRefreshRequest): InternalAuthAdapterResult {
  if (!tokens.accessToken) {
    return {
      ok: false,
      status: 'error',
      message: 'Cline did not return an access token.',
    };
  }

  const expiresAt = normalizeExpiresAt(tokens.expiresAt) ?? expiresAtFromNow();
  const displayName = tokens.email || [tokens.firstName, tokens.lastName].filter(Boolean).join(' ') || 'Cline';
  const refreshable = Boolean(tokens.refreshToken || ('refreshToken' in request && request.refreshToken));
  const scopes = isRefreshRequest(request) ? request.account.authState?.scopes : request.scopes;

  return {
    ok: true,
    account: {
      providerId: 'cline',
      authMethod: 'oauthPkce',
      externalAccountId: tokens.email,
      displayName,
      metadata: {
        email: tokens.email,
        firstName: tokens.firstName,
        lastName: tokens.lastName,
      },
      authState: {
        configured: true,
        expiresAt,
        refreshable,
        clientId: request.clientId || undefined,
        scopes,
      },
    },
    credentialMaterial: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || ('refreshToken' in request ? request.refreshToken : undefined),
      expiresAt,
      tokenType: 'Bearer',
    },
  };
}

export const clineOAuthAdapter: OAuthPkceAuthAdapter = {
  providerId: 'cline',

  async startAuth(request: OAuthPkceStartRequest): Promise<ProviderAuthFlowResponse> {
    const url = new URL(CLINE_AUTHORIZE_URL);
    url.searchParams.set('client_type', 'extension');
    url.searchParams.set('callback_url', request.redirectUri);
    url.searchParams.set('redirect_uri', request.redirectUri);
    url.searchParams.set('state', request.state);

    return {
      ok: true,
      status: 'started',
      providerId: 'cline',
      authMethod: 'oauthPkce',
      authorizationUrl: url.toString(),
      message: 'Authorize Cline in your browser.',
    };
  },

  async exchangeCode(request: OAuthPkceCompleteRequest): Promise<InternalAuthAdapterResult> {
    try {
      const tokens = decodeTokenFromCode(request.code) ?? await exchangeCodeForToken(request.code, request.redirectUri);
      return mapSuccess(tokens, request);
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Cline token exchange failed.',
      };
    }
  },

  async refresh(request: OAuthPkceRefreshRequest): Promise<InternalAuthAdapterResult> {
    try {
      const tokens = await refreshToken(request.refreshToken);
      return mapSuccess(tokens, request);
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Cline token refresh failed.',
      };
    }
  },

  async revoke(account): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'not_implemented',
      providerId: account.providerId,
      authMethod: 'oauthPkce',
      accountId: account.id,
      message: 'Cline token revocation is not implemented.',
    };
  },

  async validate(account): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'not_required',
      providerId: account.providerId,
      authMethod: 'oauthPkce',
      accountId: account.id,
      message: 'Cline validation is handled by token refresh and API requests.',
    };
  },
};
