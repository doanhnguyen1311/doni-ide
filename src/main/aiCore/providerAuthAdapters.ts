import type { AiAuthMethodId, AiProviderAccount, AiSettings } from '../../shared/types';
import { apiKeyAuthAdapter } from './apiKeyAuthAdapter';
import { localNoAuthAdapter } from './localNoAuthAdapter';
import { oauthBearerAuthAdapter } from './oauthBearerAuthAdapter';
import { getProviderDefinition } from './providerRegistry';

export interface ProviderAuthContext {
  settings: AiSettings;
  account: AiProviderAccount;
}

export interface ResolvedProviderAuth {
  method: AiAuthMethodId;
  headers: Record<string, string>;
}

export interface ProviderAuthAdapter {
  method: AiAuthMethodId;
  resolve(context: ProviderAuthContext): Promise<ResolvedProviderAuth>;
}

const adapters = new Map<AiAuthMethodId, ProviderAuthAdapter>();
for (const adapter of [apiKeyAuthAdapter, localNoAuthAdapter, oauthBearerAuthAdapter]) {
  adapters.set(adapter.method, adapter);
}
adapters.set('deviceCode', {
  method: 'deviceCode',
  async resolve(context) {
    const resolved = await oauthBearerAuthAdapter.resolve(context);
    return {
      ...resolved,
      method: 'deviceCode',
    };
  },
});

export function defaultAuthMethodForProvider(providerId: string): AiAuthMethodId {
  const provider = getProviderDefinition(providerId);
  const firstAvailable = provider?.authMethods?.find((method) => method.status === 'available');
  if (firstAvailable) return firstAvailable.id;
  if (provider?.authType === 'none') return 'localNoAuth';
  const firstDeclared = provider?.authMethods?.[0];
  if (firstDeclared) return firstDeclared.id;
  return 'apiKey';
}

export async function resolveProviderAuth(context: ProviderAuthContext): Promise<ResolvedProviderAuth> {
  const method = context.account.authMethod ?? defaultAuthMethodForProvider(context.account.providerId);
  const adapter = adapters.get(method);
  if (!adapter) {
    throw new Error(`AI auth method is not implemented yet: ${method}`);
  }
  return adapter.resolve(context);
}

export function applyResolvedAuth(auth: ResolvedProviderAuth): { authHeaders: Record<string, string> } {
  return {
    authHeaders: auth.headers,
  };
}
