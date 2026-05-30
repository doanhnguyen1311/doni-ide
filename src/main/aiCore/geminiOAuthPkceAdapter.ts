import type { ProviderAuthFlowResponse } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';
import type { OAuthPkceAuthAdapter, OAuthPkceCompleteRequest, OAuthPkceRefreshRequest, OAuthPkceStartRequest } from './oauthPkceAuthAdapter';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GEMINI_OAUTH_SCOPES = ['https://www.googleapis.com/auth/generative-language.retriever'];

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function expiresAtFromNow(expiresIn?: number): string | undefined {
  return typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined;
}

function safeGoogleError(json: GoogleTokenResponse): string {
  return json.error_description || json.error || 'Google OAuth token exchange failed.';
}

async function exchangeToken(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || json.error || !json.access_token) {
    throw new Error(safeGoogleError(json));
  }
  return json;
}

export const geminiOAuthPkceAdapter: OAuthPkceAuthAdapter = {
  providerId: 'gemini',
  async startAuth(request: OAuthPkceStartRequest): Promise<ProviderAuthFlowResponse> {
    const scopes = request.scopes?.length ? request.scopes : GEMINI_OAUTH_SCOPES;
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set('client_id', request.clientId);
    url.searchParams.set('redirect_uri', request.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', request.state);
    url.searchParams.set('code_challenge', request.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');

    return {
      ok: true,
      status: 'started',
      providerId: 'gemini',
      authMethod: 'oauthPkce',
      authorizationUrl: url.toString(),
    };
  },
  async exchangeCode(request: OAuthPkceCompleteRequest): Promise<InternalAuthAdapterResult> {
    try {
      const body = new URLSearchParams({
        client_id: request.clientId,
        code: request.code,
        code_verifier: request.verifier,
        grant_type: 'authorization_code',
        redirect_uri: request.redirectUri,
      });
      if (request.clientSecret) {
        body.set('client_secret', request.clientSecret);
      }
      const token = await exchangeToken(body);
      const scopes = token.scope?.split(/\s+/).filter(Boolean) || request.scopes;
      const expiresAt = expiresAtFromNow(token.expires_in);
      return {
        ok: true,
        account: {
          providerId: 'gemini',
          authMethod: 'oauthPkce',
          displayName: 'Google Gemini OAuth',
          authState: {
            configured: true,
            expiresAt,
            refreshable: Boolean(token.refresh_token),
            clientId: request.clientId,
            scopes,
          },
        },
        credentialMaterial: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt,
          scopes,
          tokenType: token.token_type,
        },
      };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Google OAuth token exchange failed.',
      };
    }
  },
  async refresh(request: OAuthPkceRefreshRequest): Promise<InternalAuthAdapterResult> {
    try {
      const body = new URLSearchParams({
        client_id: request.clientId,
        grant_type: 'refresh_token',
        refresh_token: request.refreshToken,
      });
      if (request.clientSecret) {
        body.set('client_secret', request.clientSecret);
      }
      const token = await exchangeToken(body);
      const scopes = token.scope?.split(/\s+/).filter(Boolean) || request.account.authState?.scopes;
      const expiresAt = expiresAtFromNow(token.expires_in);
      return {
        ok: true,
        account: {
          providerId: 'gemini',
          authMethod: 'oauthPkce',
          authState: {
            configured: true,
            expiresAt,
            refreshable: true,
            lastRefreshAt: new Date().toISOString(),
            clientId: request.clientId,
            scopes,
          },
        },
        credentialMaterial: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt,
          scopes,
          tokenType: token.token_type,
        },
      };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Google OAuth refresh failed.',
      };
    }
  },
  async revoke(): Promise<ProviderAuthFlowResponse> {
    return {
      ok: false,
      status: 'not_implemented',
      providerId: 'gemini',
      authMethod: 'oauthPkce',
      message: 'Gemini OAuth revoke is not implemented yet.',
    };
  },
  async validate(): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'not_required',
      providerId: 'gemini',
      authMethod: 'oauthPkce',
      message: 'Gemini OAuth validation is handled by token refresh and API requests.',
    };
  },
};
