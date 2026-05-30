import type { AiAuthMethodId, ProviderAuthMethodMetadata } from '../../shared/types';

const AUTH_METHODS: ProviderAuthMethodMetadata[] = [
  {
    id: 'apiKey',
    displayName: 'API Key',
    description: 'Store an API key in Doni Secret Store and send it as a provider credential.',
    requiresSecret: true,
    supportsRefresh: false,
    status: 'available',
  },
  {
    id: 'localNoAuth',
    displayName: 'Local / No Auth',
    description: 'Use a local OpenAI-compatible endpoint without a credential.',
    requiresSecret: false,
    supportsRefresh: false,
    status: 'available',
  },
  {
    id: 'oauthPkce',
    displayName: 'OAuth PKCE',
    description: 'Future OAuth browser sign-in flow.',
    requiresSecret: true,
    supportsRefresh: true,
    status: 'future',
  },
  {
    id: 'deviceCode',
    displayName: 'Device Code',
    description: 'Future device authorization flow.',
    requiresSecret: true,
    supportsRefresh: true,
    status: 'future',
  },
  {
    id: 'tokenImport',
    displayName: 'Token Import',
    description: 'Future advanced token import flow.',
    requiresSecret: true,
    supportsRefresh: true,
    status: 'future',
  },
  {
    id: 'cookieSession',
    displayName: 'Cookie Session',
    description: 'Future advanced cookie session flow.',
    requiresSecret: true,
    supportsRefresh: true,
    status: 'future',
  },
];

const authMethodById = new Map(AUTH_METHODS.map((method) => [method.id, method]));

export function listAuthMethods(): ProviderAuthMethodMetadata[] {
  return AUTH_METHODS.map((method) => ({ ...method }));
}

export function getAuthMethod(methodId: AiAuthMethodId): ProviderAuthMethodMetadata | undefined {
  const method = authMethodById.get(methodId);
  return method ? { ...method } : undefined;
}

export function getAuthMethods(methodIds: AiAuthMethodId[]): ProviderAuthMethodMetadata[] {
  return methodIds.map((methodId) => getAuthMethod(methodId)).filter((method): method is ProviderAuthMethodMetadata => Boolean(method));
}
