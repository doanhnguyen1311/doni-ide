import type { ProviderAuthFlowResponse, StartProviderAuthRequest } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';
import type { DeviceCodeAuthAdapter, DeviceCodePollRequest, DeviceCodeRefreshRequest, DeviceCodeStartResult } from './deviceCodeAuthAdapter';
import { readSecret } from './secretStore';

const GITHUB_COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'GitHubCopilotChat/0.26.7';
const GITHUB_SCOPES = ['read:user'];

interface GitHubDeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id?: number;
  login?: string;
  name?: string | null;
  email?: string | null;
}

interface GitHubCopilotTokenResponse {
  token?: string;
  expires_at?: string | number;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: 'invalid_response', error_description: text.slice(0, 200) } as T;
  }
}

function failure(status: ProviderAuthFlowResponse['status'], message: string): ProviderAuthFlowResponse {
  return {
    ok: false,
    status,
    providerId: 'github-copilot',
    authMethod: 'deviceCode',
    message,
  };
}

async function fetchCopilotToken(githubAccessToken: string): Promise<GitHubCopilotTokenResponse> {
  const response = await fetch(GITHUB_COPILOT_TOKEN_URL, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: 'application/json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': GITHUB_USER_AGENT,
      'Editor-Version': 'vscode/1.85.0',
      'Editor-Plugin-Version': 'copilot-chat/0.26.7',
    },
  });
  return response.ok ? readJsonResponse<GitHubCopilotTokenResponse>(response) : {};
}

async function fetchGitHubUser(githubAccessToken: string): Promise<GitHubUserResponse> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: 'application/json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': GITHUB_USER_AGENT,
    },
  });
  return response.ok ? readJsonResponse<GitHubUserResponse>(response) : {};
}

function mapSuccess(tokens: GitHubTokenResponse, copilotToken: GitHubCopilotTokenResponse, userInfo: GitHubUserResponse): InternalAuthAdapterResult {
  if (!tokens.access_token) {
    return {
      ok: false,
      status: 'error',
      message: 'GitHub did not return an access token.',
    };
  }

  const displayName = userInfo.name || userInfo.login || userInfo.email || 'GitHub Copilot';
  return {
    ok: true,
    account: {
      providerId: 'github-copilot',
      authMethod: 'deviceCode',
      externalAccountId: userInfo.id ? String(userInfo.id) : userInfo.login,
      displayName,
      metadata: {
        githubUserId: userInfo.id,
        githubLogin: userInfo.login,
        githubName: userInfo.name ?? undefined,
        githubEmail: userInfo.email ?? undefined,
        copilotTokenExpiresAt: copilotToken.expires_at,
      },
      authState: {
        configured: true,
        refreshable: Boolean(tokens.refresh_token),
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined,
        scopes: tokens.scope ? tokens.scope.split(/[,\s]+/).filter(Boolean) : GITHUB_SCOPES,
        clientId: GITHUB_COPILOT_CLIENT_ID,
      },
    },
    credentialMaterial: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      copilotToken: copilotToken.token,
      copilotTokenExpiresAt: typeof copilotToken.expires_at === 'string' ? copilotToken.expires_at : undefined,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined,
      scopes: tokens.scope ? tokens.scope.split(/[,\s]+/).filter(Boolean) : GITHUB_SCOPES,
      tokenType: tokens.token_type,
    },
  };
}

export const githubCopilotDeviceCodeAuthAdapter: DeviceCodeAuthAdapter = {
  providerId: 'github-copilot',

  async startDeviceCode(_request: StartProviderAuthRequest): Promise<DeviceCodeStartResult> {
    const response = await fetch(GITHUB_DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: GITHUB_COPILOT_CLIENT_ID,
        scope: GITHUB_SCOPES.join(' '),
      }),
    });
    const data = await readJsonResponse<GitHubDeviceCodeResponse>(response);
    if (!response.ok || data.error) {
      return failure('error', data.error_description || data.error || 'GitHub device-code request failed.');
    }
    if (!data.device_code || !data.user_code || !data.verification_uri) {
      return failure('error', 'GitHub device-code response was missing required fields.');
    }
    return {
      ok: true,
      providerId: 'github-copilot',
      authMethod: 'deviceCode',
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      ...(data.verification_uri_complete ? { verificationUriComplete: data.verification_uri_complete } : {}),
      expiresInSeconds: data.expires_in,
      intervalSeconds: data.interval,
      clientId: GITHUB_COPILOT_CLIENT_ID,
      scopes: GITHUB_SCOPES,
      message: 'Visit GitHub device login and enter the code.',
    };
  },

  async pollDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse | InternalAuthAdapterResult> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: GITHUB_COPILOT_CLIENT_ID,
        device_code: request.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await readJsonResponse<GitHubTokenResponse>(response);

    if (data.access_token) {
      const [copilotToken, userInfo] = await Promise.all([
        fetchCopilotToken(data.access_token),
        fetchGitHubUser(data.access_token),
      ]);
      return mapSuccess(data, copilotToken, userInfo);
    }

    if (data.error === 'authorization_pending') {
      return {
        ok: true,
        status: 'pending',
        providerId: 'github-copilot',
        authMethod: 'deviceCode',
        sessionId: request.sessionId,
        message: 'Waiting for GitHub authorization...',
      };
    }

    if (data.error === 'slow_down') {
      return {
        ok: true,
        status: 'slow_down',
        providerId: 'github-copilot',
        authMethod: 'deviceCode',
        sessionId: request.sessionId,
        message: 'GitHub asked Doni to poll more slowly.',
      };
    }

    if (data.error === 'expired_token') {
      return {
        ok: false,
        status: 'expired',
        message: data.error_description || 'GitHub device code expired.',
      };
    }

    return {
      ok: false,
      status: response.ok ? 'error' : 'denied',
      message: data.error_description || data.error || 'GitHub device-code polling failed.',
    };
  },

  async cancelDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'cancelled',
      providerId: 'github-copilot',
      authMethod: 'deviceCode',
      sessionId: request.sessionId,
      message: 'GitHub Copilot device-code flow cancelled.',
    };
  },

  async refresh(request: DeviceCodeRefreshRequest): Promise<InternalAuthAdapterResult> {
    const accessTokenReference = request.account.credentialReferences?.accessToken;
    if (!accessTokenReference) {
      return {
        ok: false,
        status: 'not_implemented',
        message: 'GitHub Copilot account does not have a GitHub access token reference.',
      };
    }
    const githubAccessToken = await readSecret(accessTokenReference);
    const copilotToken = await fetchCopilotToken(githubAccessToken);
    if (!copilotToken.token) {
      return {
        ok: false,
        status: 'error',
        message: 'Could not refresh GitHub Copilot token.',
      };
    }
    return {
      ok: true,
      account: {
        providerId: request.account.providerId,
        authMethod: 'deviceCode',
        displayName: request.account.displayName,
        metadata: {
          ...request.account.metadata,
          copilotTokenExpiresAt: copilotToken.expires_at,
        },
        authState: {
          ...request.account.authState,
          configured: true,
          lastRefreshAt: new Date().toISOString(),
        },
      },
      credentialMaterial: {
        copilotToken: copilotToken.token,
        copilotTokenExpiresAt: typeof copilotToken.expires_at === 'string' ? copilotToken.expires_at : undefined,
      },
    };
  },

  async revoke(account): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'not_implemented',
      providerId: account.providerId,
      authMethod: 'deviceCode',
      accountId: account.id,
      message: 'GitHub token revocation is not implemented.',
    };
  },
};

