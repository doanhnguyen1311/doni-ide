import type { ProviderAuthFlowResponse, StartProviderAuthRequest } from '../../shared/types';
import type { InternalAuthAdapterResult } from './authAdapterResults';
import type { DeviceCodeAuthAdapter, DeviceCodePollRequest, DeviceCodeRefreshRequest, DeviceCodeStartResult } from './deviceCodeAuthAdapter';

const KILO_API_BASE_URL = 'https://api.kilo.ai';
const KILO_DEVICE_CODE_URL = `${KILO_API_BASE_URL}/api/device-auth/codes`;
const KILO_PROFILE_URL = `${KILO_API_BASE_URL}/api/profile`;
const DEFAULT_EXPIRES_IN_SECONDS = 300;
const DEFAULT_INTERVAL_SECONDS = 3;

interface KiloDeviceCodeResponse {
  code?: string;
  verificationUrl?: string;
  expiresIn?: number;
  error?: string;
  message?: string;
}

interface KiloPollResponse {
  status?: string;
  token?: string;
  userEmail?: string;
  error?: string;
  message?: string;
}

interface KiloProfileResponse {
  email?: string;
  name?: string;
  user?: {
    email?: string;
    name?: string;
  };
  organizations?: Array<{
    id?: string | number;
    name?: string;
  }>;
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

function failure(status: ProviderAuthFlowResponse['status'], message: string): ProviderAuthFlowResponse {
  return {
    ok: false,
    status,
    providerId: 'kilo-code',
    authMethod: 'deviceCode',
    message,
  };
}

async function fetchKiloProfile(accessToken: string): Promise<KiloProfileResponse> {
  try {
    const response = await fetch(KILO_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    return response.ok ? readJsonResponse<KiloProfileResponse>(response) : {};
  } catch {
    return {};
  }
}

function mapSuccess(data: KiloPollResponse, profile: KiloProfileResponse): InternalAuthAdapterResult {
  if (!data.token) {
    return {
      ok: false,
      status: 'error',
      message: 'Kilo Code did not return an access token.',
    };
  }

  const organization = profile.organizations?.[0];
  const orgId = organization?.id === undefined ? undefined : String(organization.id);
  const email = data.userEmail || profile.email || profile.user?.email;
  const displayName = email || profile.name || profile.user?.name || organization?.name || 'Kilo Code';

  return {
    ok: true,
    account: {
      providerId: 'kilo-code',
      authMethod: 'deviceCode',
      externalAccountId: email || (orgId ? `org:${orgId}` : undefined),
      displayName,
      metadata: {
        email,
        orgId,
        organizationName: organization?.name,
      },
      authState: {
        configured: true,
        refreshable: false,
      },
    },
    credentialMaterial: {
      accessToken: data.token,
    },
  };
}

export const kiloCodeDeviceCodeAuthAdapter: DeviceCodeAuthAdapter = {
  providerId: 'kilo-code',

  async startDeviceCode(_request: StartProviderAuthRequest): Promise<DeviceCodeStartResult> {
    const response = await fetch(KILO_DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const data = await readJsonResponse<KiloDeviceCodeResponse>(response);
    if (!response.ok) {
      if (response.status === 429) {
        return failure('error', 'Too many pending Kilo Code authorization requests. Please try again later.');
      }
      return failure('error', data.message || data.error || 'Kilo Code device-code request failed.');
    }
    if (!data.code || !data.verificationUrl) {
      return failure('error', 'Kilo Code device-code response was missing required fields.');
    }

    return {
      ok: true,
      providerId: 'kilo-code',
      authMethod: 'deviceCode',
      deviceCode: data.code,
      userCode: data.code,
      verificationUri: data.verificationUrl,
      verificationUriComplete: data.verificationUrl,
      expiresInSeconds: data.expiresIn ?? DEFAULT_EXPIRES_IN_SECONDS,
      intervalSeconds: DEFAULT_INTERVAL_SECONDS,
      message: 'Visit Kilo Code device login and authorize the code.',
    };
  },

  async pollDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse | InternalAuthAdapterResult> {
    const response = await fetch(`${KILO_DEVICE_CODE_URL}/${encodeURIComponent(request.deviceCode)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 202) {
      return {
        ok: true,
        status: 'pending',
        providerId: 'kilo-code',
        authMethod: 'deviceCode',
        sessionId: request.sessionId,
        message: 'Waiting for Kilo Code authorization...',
      };
    }
    if (response.status === 403) {
      return {
        ok: false,
        status: 'denied',
        message: 'Kilo Code authorization was denied.',
      };
    }
    if (response.status === 410) {
      return {
        ok: false,
        status: 'expired',
        message: 'Kilo Code device code expired.',
      };
    }

    const data = await readJsonResponse<KiloPollResponse>(response);
    if (!response.ok) {
      return {
        ok: false,
        status: 'error',
        message: data.message || data.error || `Kilo Code polling failed with HTTP ${response.status}.`,
      };
    }
    if (data.status === 'approved' && data.token) {
      const profile = await fetchKiloProfile(data.token);
      return mapSuccess(data, profile);
    }

    return {
      ok: true,
      status: 'pending',
      providerId: 'kilo-code',
      authMethod: 'deviceCode',
      sessionId: request.sessionId,
      message: 'Waiting for Kilo Code authorization...',
    };
  },

  async cancelDeviceCode(request: DeviceCodePollRequest): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'cancelled',
      providerId: 'kilo-code',
      authMethod: 'deviceCode',
      sessionId: request.sessionId,
      message: 'Kilo Code device-code flow cancelled.',
    };
  },

  async refresh(_request: DeviceCodeRefreshRequest): Promise<InternalAuthAdapterResult> {
    return {
      ok: false,
      status: 'not_implemented',
      message: 'Kilo Code device-code tokens are not refreshable.',
    };
  },

  async revoke(account): Promise<ProviderAuthFlowResponse> {
    return {
      ok: true,
      status: 'not_implemented',
      providerId: account.providerId,
      authMethod: 'deviceCode',
      accountId: account.id,
      message: 'Kilo Code token revocation is not implemented.',
    };
  },
};
