import type {
  AiAuthMethodId,
  ProviderCapability,
  ProviderDefinition,
  ProviderModelDiscoveryDefinition,
} from '../../shared/types';
import { providerModelDefinitions } from '../../shared/modelCatalog';
import { getAuthMethods } from './authMethodRegistry';

const OPENAI_COMPATIBLE_CAPABILITIES: ProviderCapability[] = ['chat', 'streaming', 'tools'];
const CLOUD_API_KEY_AUTH: AiAuthMethodId[] = ['apiKey'];
const LOCAL_NO_AUTH: AiAuthMethodId[] = ['localNoAuth'];
const FUTURE_OAUTH_AUTH: AiAuthMethodId[] = ['oauthPkce', 'deviceCode', 'tokenImport'];
const API_KEY_WITH_FUTURE_OAUTH_AUTH: AiAuthMethodId[] = ['apiKey', 'oauthPkce', 'deviceCode'];
const GEMINI_AUTH: AiAuthMethodId[] = ['apiKey', 'oauthPkce'];
const GEMINI_OAUTH_SCOPES = ['https://www.googleapis.com/auth/generative-language.retriever'];

const DISCOVERY = {
  openAiCompatible: {
    strategy: 'openai-compatible',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  openRouter: {
    strategy: 'openrouter',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  gemini: {
    strategy: 'gemini',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  anthropic: {
    strategy: 'anthropic',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  ollama: {
    strategy: 'ollama',
    endpoint: '/api/tags',
    supportsRemote: true,
    cacheable: true,
  },
  lmStudio: {
    strategy: 'lm-studio',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  customOpenAiCompatible: {
    strategy: 'custom-openai-compatible',
    endpoint: '/models',
    supportsRemote: true,
    cacheable: true,
  },
  manual: {
    strategy: 'manual',
    supportsRemote: false,
    cacheable: false,
  },
} satisfies Record<string, ProviderModelDiscoveryDefinition>;

interface ProviderInput extends Omit<ProviderDefinition, 'authMethods' | 'supportedModels'> {
  authMethodIds: AiAuthMethodId[];
  supportedModels?: ProviderDefinition['supportedModels'];
}

function withAuthMethods(provider: ProviderInput): ProviderDefinition {
  const { authMethodIds, supportedModels, ...definition } = provider;
  return {
    ...definition,
    authMethods: getAuthMethods(authMethodIds),
    supportedModels: supportedModels ?? [],
  };
}

function withGeminiAuthMethods(provider: Omit<ProviderInput, 'authMethodIds'>): ProviderDefinition {
  return {
    ...provider,
    authMethods: getAuthMethods(GEMINI_AUTH).map((method) =>
      method.id === 'oauthPkce'
        ? {
            ...method,
            status: 'available',
            requiresClientId: true,
            scopes: GEMINI_OAUTH_SCOPES,
            description: 'Sign in with a Google OAuth desktop client using PKCE.',
          }
        : method,
    ),
    supportedModels: provider.supportedModels ?? [],
  };
}

function withGitHubCopilotAuthMethods(provider: Omit<ProviderInput, 'authMethodIds'>): ProviderDefinition {
  return {
    ...provider,
    authMethods: getAuthMethods(FUTURE_OAUTH_AUTH).map((method) =>
      method.id === 'deviceCode'
        ? {
            ...method,
            status: 'available',
            requiresSecret: false,
            description: 'Connect GitHub Copilot with the GitHub device-code login flow.',
          }
        : method,
    ),
    supportedModels: provider.supportedModels ?? [],
  };
}

function withClineAuthMethods(provider: Omit<ProviderInput, 'authMethodIds'>): ProviderDefinition {
  return {
    ...provider,
    authMethods: getAuthMethods(FUTURE_OAUTH_AUTH).map((method) =>
      method.id === 'oauthPkce'
        ? {
            ...method,
            displayName: 'Browser OAuth',
            status: 'available',
            requiresSecret: false,
            requiresClientId: false,
            description: 'Connect Cline with its browser callback authorization flow.',
          }
        : method,
    ),
    supportedModels: provider.supportedModels ?? [],
  };
}

function withKiloCodeAuthMethods(provider: Omit<ProviderInput, 'authMethodIds'>): ProviderDefinition {
  return {
    ...provider,
    authMethods: getAuthMethods(FUTURE_OAUTH_AUTH).map((method) =>
      method.id === 'deviceCode'
        ? {
            ...method,
            status: 'available',
            requiresSecret: false,
            supportsRefresh: false,
            description: 'Connect Kilo Code with its device-code login flow.',
          }
        : method,
    ),
    supportedModels: provider.supportedModels ?? [],
  };
}

const PROVIDERS: ProviderDefinition[] = [
  withAuthMethods({
    id: 'claude-code',
    displayName: 'Claude Code',
    icon: 'terminal',
    category: 'oauth',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools', 'longContext'],
  }),
  withAuthMethods({
    id: 'openai-codex',
    displayName: 'OpenAI Codex',
    icon: 'terminal',
    category: 'oauth',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools', 'reasoning'],
  }),
  withGitHubCopilotAuthMethods({
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    icon: 'github',
    category: 'oauth',
    authType: 'oauth',
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withAuthMethods({
    id: 'cursor',
    displayName: 'Cursor',
    icon: 'cursor',
    category: 'oauth',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withClineAuthMethods({
    id: 'cline',
    displayName: 'Cline',
    icon: 'bot',
    category: 'oauth',
    authType: 'oauth',
    defaultApiBase: 'https://api.cline.bot/api/v1',
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withKiloCodeAuthMethods({
    id: 'kilo-code',
    displayName: 'Kilo Code',
    icon: 'bot',
    category: 'oauth',
    authType: 'oauth',
    defaultApiBase: 'https://api.kilo.ai/api/openrouter',
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withAuthMethods({
    id: 'antigravity',
    displayName: 'Antigravity',
    icon: 'orbit',
    category: 'oauth',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withAuthMethods({
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    icon: 'gemini',
    category: 'free-tier',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
  }),
  withAuthMethods({
    id: 'kiro-ai',
    displayName: 'Kiro AI',
    icon: 'kiro',
    category: 'free-tier',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withAuthMethods({
    id: 'opencode-free',
    displayName: 'OpenCode Free',
    icon: 'code',
    category: 'free-tier',
    authType: 'oauth',
    authMethodIds: FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools'],
  }),
  withGeminiAuthMethods({
    id: 'gemini',
    displayName: 'Gemini',
    icon: 'gemini',
    category: 'free-tier',
    authType: 'apiKey',
    defaultApiBase: 'https://generativelanguage.googleapis.com/v1beta',
    modelDiscovery: DISCOVERY.gemini,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    supportedModels: providerModelDefinitions('gemini'),
  }),
  withAuthMethods({
    id: 'openrouter',
    displayName: 'OpenRouter',
    icon: 'route',
    category: 'free-tier',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    defaultApiBase: 'https://openrouter.ai/api/v1',
    modelDiscovery: DISCOVERY.openRouter,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'webSearch', 'longContext'],
  }),
  withAuthMethods({
    id: 'nvidia-nim',
    displayName: 'NVIDIA NIM',
    icon: 'gpu',
    category: 'free-tier',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    defaultApiBase: 'https://integrate.api.nvidia.com/v1',
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'vertex-ai',
    displayName: 'Vertex AI',
    icon: 'cloud',
    category: 'free-tier',
    authType: 'apiKey',
    authMethodIds: API_KEY_WITH_FUTURE_OAUTH_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
  }),
  withAuthMethods({
    id: 'cloudflare',
    displayName: 'Cloudflare',
    icon: 'cloud',
    category: 'free-tier',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'openai',
    displayName: 'OpenAI',
    icon: 'openai',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: API_KEY_WITH_FUTURE_OAUTH_AUTH,
    defaultApiBase: 'https://api.openai.com/v1',
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'longContext'],
    supportedModels: providerModelDefinitions('openai'),
  }),
  withAuthMethods({
    id: 'anthropic',
    displayName: 'Anthropic',
    icon: 'anthropic',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    defaultApiBase: 'https://api.anthropic.com/v1',
    modelDiscovery: DISCOVERY.anthropic,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    supportedModels: providerModelDefinitions('anthropic'),
  }),
  withAuthMethods({
    id: 'azure-openai',
    displayName: 'Azure OpenAI',
    icon: 'azure',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'longContext'],
  }),
  withAuthMethods({
    id: 'alibaba',
    displayName: 'Alibaba',
    icon: 'cloud',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'cohere',
    displayName: 'Cohere',
    icon: 'cohere',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.manual,
    capabilities: ['chat', 'streaming', 'tools', 'longContext'],
  }),
  withAuthMethods({
    id: 'cerebras',
    displayName: 'Cerebras',
    icon: 'chip',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    defaultApiBase: 'https://api.cerebras.ai/v1',
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'chutes-ai',
    displayName: 'Chutes AI',
    icon: 'cloud',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'openai-compatible',
    displayName: 'OpenAI Compatible',
    icon: 'sparkles',
    category: 'api-key',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.customOpenAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'ollama',
    displayName: 'Ollama',
    icon: 'server',
    category: 'local',
    authType: 'none',
    authMethodIds: LOCAL_NO_AUTH,
    defaultApiBase: 'http://localhost:11434/v1',
    modelDiscovery: DISCOVERY.ollama,
    capabilities: ['chat', 'streaming', 'local'],
  }),
  withAuthMethods({
    id: 'lm-studio',
    displayName: 'LM Studio',
    icon: 'monitor',
    category: 'local',
    authType: 'none',
    authMethodIds: LOCAL_NO_AUTH,
    defaultApiBase: 'http://localhost:1234/v1',
    modelDiscovery: DISCOVERY.lmStudio,
    capabilities: ['chat', 'streaming', 'local'],
  }),
  withAuthMethods({
    id: 'openai-compatible-local',
    displayName: 'OpenAI Compatible Local',
    icon: 'monitor',
    category: 'local',
    authType: 'none',
    authMethodIds: LOCAL_NO_AUTH,
    modelDiscovery: DISCOVERY.openAiCompatible,
    capabilities: ['chat', 'streaming', 'local'],
  }),
  withAuthMethods({
    id: 'custom-endpoint',
    displayName: 'Custom Endpoint',
    icon: 'plug',
    category: 'custom',
    authType: 'apiKey',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.customOpenAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
  withAuthMethods({
    id: 'user-defined',
    displayName: 'User Defined',
    icon: 'plug',
    category: 'custom',
    authType: 'custom',
    authMethodIds: CLOUD_API_KEY_AUTH,
    modelDiscovery: DISCOVERY.customOpenAiCompatible,
    capabilities: OPENAI_COMPATIBLE_CAPABILITIES,
  }),
];

const providerById = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

function cloneProvider(provider: ProviderDefinition): ProviderDefinition {
  return {
    ...provider,
    authMethods: provider.authMethods?.map((method) => ({ ...method })),
    modelDiscovery: { ...provider.modelDiscovery },
    connectionSummary: provider.connectionSummary
      ? {
          ...provider.connectionSummary,
          accounts: provider.connectionSummary.accounts.map((account) => ({ ...account })),
        }
      : undefined,
    capabilities: [...provider.capabilities],
    supportedModels: provider.supportedModels.map((model) => ({
      ...model,
      capabilities: [...model.capabilities],
    })),
  };
}

export function listProviderDefinitions(): ProviderDefinition[] {
  return PROVIDERS.map(cloneProvider);
}

export function getProviderDefinition(providerId: string): ProviderDefinition | undefined {
  const provider = providerById.get(providerId);
  return provider ? cloneProvider(provider) : undefined;
}

export function providerHasCapability(providerId: string, capability: ProviderCapability): boolean {
  return providerById.get(providerId)?.capabilities.includes(capability) ?? false;
}

export function defaultApiBaseForProvider(providerId: string): string {
  return providerById.get(providerId)?.defaultApiBase ?? '';
}
