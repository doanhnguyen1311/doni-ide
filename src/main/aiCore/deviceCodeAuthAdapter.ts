import type { AiProviderAccount, ProviderAuthFlowResponse, StartProviderAuthRequest } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';

export interface DeviceCodeStartSuccess {
  ok: true;
  providerId: string;
  authMethod: 'deviceCode';
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds?: number;
  intervalSeconds?: number;
  clientId?: string;
  scopes?: string[];
  message?: string;
}

export type DeviceCodeStartResult = DeviceCodeStartSuccess | ProviderAuthFlowResponse;

export interface DeviceCodePollRequest {
  sessionId: string;
  deviceCode: string;
}

export interface DeviceCodeRefreshRequest {
  account: AiProviderAccount;
  refreshBefore?: string;
}

export interface DeviceCodeAuthAdapter {
  providerId: string;
  startDeviceCode(request: StartProviderAuthRequest): Promise<DeviceCodeStartResult>;
  pollDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse | InternalAuthAdapterResult>;
  cancelDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse>;
  refresh(request: DeviceCodeRefreshRequest): Promise<InternalAuthAdapterResult>;
  revoke(account: AiProviderAccount): Promise<ProviderAuthFlowResponse>;
}
