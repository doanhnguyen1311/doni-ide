import type { ProviderCapability, ProviderModelDefinition } from './types';

export interface CatalogModelDefinition extends ProviderModelDefinition {
  providerId: string;
  providerName: string;
  providerIcon: string;
  description?: string;
}

export const DEFAULT_VISIBLE_MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
};

export const MODEL_CATALOG: CatalogModelDefinition[] = [
  {
    id: 'gpt-5',
    displayName: 'GPT-5',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerIcon: 'AI',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'longContext'],
    description: 'Flagship OpenAI reasoning model for complex work.',
  },
  {
    id: 'gpt-5-mini',
    displayName: 'GPT-5 Mini',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerIcon: 'AI',
    capabilities: ['chat', 'streaming', 'tools', 'reasoning'],
    description: 'Fast OpenAI model for everyday coding and chat.',
  },
  {
    id: 'gpt-4.1',
    displayName: 'GPT-4.1',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerIcon: 'AI',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    description: 'General purpose OpenAI model with strong instruction following.',
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    providerId: 'gemini',
    providerName: 'Gemini',
    providerIcon: 'G',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'longContext'],
    description: 'Advanced Gemini model for reasoning-heavy code and analysis.',
  },
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    providerId: 'gemini',
    providerName: 'Gemini',
    providerIcon: 'G',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    description: 'Balanced Gemini model for fast daily coding work.',
  },
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    providerId: 'gemini',
    providerName: 'Gemini',
    providerIcon: 'G',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    description: 'Reliable Gemini Flash model with broad multimodal support.',
  },
  {
    id: 'gemini-exp-1206',
    displayName: 'Gemini Experimental',
    providerId: 'gemini',
    providerName: 'Gemini',
    providerIcon: 'G',
    capabilities: ['chat', 'streaming', 'vision', 'reasoning', 'longContext'],
    description: 'Experimental Gemini endpoint for trying newer behavior.',
  },
  {
    id: 'claude-sonnet',
    displayName: 'Claude Sonnet',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerIcon: 'C',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'longContext'],
    description: 'Balanced Anthropic model for coding and product work.',
  },
  {
    id: 'claude-opus',
    displayName: 'Claude Opus',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerIcon: 'C',
    capabilities: ['chat', 'streaming', 'tools', 'vision', 'reasoning', 'longContext'],
    description: 'High-capability Anthropic model for difficult tasks.',
  },
];

export function catalogModelsForProvider(providerId: string): CatalogModelDefinition[] {
  return MODEL_CATALOG.filter((model) => model.providerId === providerId);
}

export function getCatalogModel(modelId: string, providerId?: string): CatalogModelDefinition | undefined {
  return MODEL_CATALOG.find((model) => model.id === modelId && (!providerId || model.providerId === providerId));
}

export function getVisibleModelIds(providerId: string, visibleModels?: Record<string, string[]>): string[] {
  const configured = visibleModels?.[providerId];
  if (configured) {
    return [...new Set(configured.map((modelId) => modelId.trim()).filter(Boolean))];
  }
  return DEFAULT_VISIBLE_MODELS[providerId] ? [...DEFAULT_VISIBLE_MODELS[providerId]] : [];
}

export function providerModelDefinitions(providerId: string): ProviderModelDefinition[] {
  return catalogModelsForProvider(providerId).map(({ id, displayName, contextWindowTokens, capabilities }) => ({
    id,
    displayName,
    contextWindowTokens,
    capabilities: [...capabilities] as ProviderCapability[],
  }));
}
