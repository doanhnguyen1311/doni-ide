import type { AiProviderAccount, ProviderAuthFlowResponse, StartProviderAuthRequest } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';

export interface OAuthPkceStartRequest extends StartProviderAuthRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export interface OAuthPkceCompleteRequest {
  sessionId: string;
  code: string;
  state?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  verifier: string;
  scopes?: string[];
}

export interface OAuthPkceRefreshRequest {
  account: AiProviderAccount;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  refreshBefore?: string;
}

export interface OAuthPkceAuthAdapter {
  providerId: string;
  startAuth(request: OAuthPkceStartRequest): Promise<ProviderAuthFlowResponse>;
  exchangeCode(request: OAuthPkceCompleteRequest): Promise<InternalAuthAdapterResult>;
  refresh(request: OAuthPkceRefreshRequest): Promise<InternalAuthAdapterResult>;
  revoke(account: AiProviderAccount): Promise<ProviderAuthFlowResponse>;
  validate(account: AiProviderAccount): Promise<ProviderAuthFlowResponse>;
}
