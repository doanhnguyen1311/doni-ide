import type { AiAuthMethodId } from '../../shared/types';

export interface InternalAuthCredentialMaterial {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  cookie?: string;
  copilotToken?: string;
  expiresAt?: string;
  copilotTokenExpiresAt?: string;
  scopes?: string[];
  tokenType?: string;
}

export interface InternalAuthAccountUpdate {
  providerId: string;
  authMethod: AiAuthMethodId;
  externalAccountId?: string;
  displayName?: string;
  credentialReferences?: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    cookie?: string;
    copilotToken?: string;
  };
  metadata?: Record<string, string | number | boolean | null | undefined>;
  authState?: {
    configured?: boolean;
    expiresAt?: string;
    refreshable?: boolean;
    lastRefreshAt?: string;
    clientId?: string;
    scopes?: string[];
  };
}

export interface InternalAuthSuccessResult {
  ok: true;
  account: InternalAuthAccountUpdate;
  // Main-process only: raw credentials must be written to Secret Store immediately,
  // then discarded and replaced with credentialReferences before any IPC response.
  credentialMaterial?: InternalAuthCredentialMaterial;
}

export interface InternalAuthFailureResult {
  ok: false;
  status: 'denied' | 'slow_down' | 'expired' | 'error' | 'not_implemented';
  message: string;
  retryAfterSeconds?: number;
}

export type InternalAuthAdapterResult = InternalAuthSuccessResult | InternalAuthFailureResult;
