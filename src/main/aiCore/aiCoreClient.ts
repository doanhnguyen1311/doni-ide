import type { AiNetworkEvent, AiSettings, AiTaskType, ChatMessage, ChatResponse, ChatStreamEvent } from '../../shared/types';
import { resolveAccount } from './accountManager';
import type { ResolvedAiAccount } from './accountManager';
import { markAccountFailure, markAccountSuccess } from './accountHealthStore';
import { AiProviderError, isRetryableProviderError } from './errors';
import { markModelLock } from './modelLockStore';
import { createGeminiChatCompletion } from './geminiAdapter';
import { createOpenAiCompatibleChatCompletion } from './openAiCompatibleAdapter';
import { getProviderDefinition, providerHasCapability } from './providerRegistry';
import { routeChatRequest } from './modelRouter';

export interface AiCoreChatOptions {
  taskType?: AiTaskType;
  model?: string;
  stream?: boolean;
  temperature?: number;
  signal?: AbortSignal;
  onStreamEvent?: (event: ChatStreamEvent) => void;
  onNetworkEvent?: (event: AiNetworkEvent) => void;
  recordHealth?: boolean;
}

const OPENAI_COMPATIBLE_ADAPTER_PROVIDERS = new Set([
  'openai-compatible',
  'openai-compatible-local',
  'custom-endpoint',
  'user-defined',
  'openai',
  'openrouter',
  'ollama',
  'lm-studio',
  'nvidia-nim',
  'azure-openai',
  'alibaba',
  'cerebras',
  'chutes-ai',
  'cloudflare',
]);
const GEMINI_ADAPTER_PROVIDERS = new Set(['gemini']);

function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

function assertAdapterAvailable(providerId: string): void {
  const provider = getProviderDefinition(providerId);
  if (!provider) {
    throw new AiProviderError(`Unknown provider: ${providerId}`);
  }
  if (!providerHasCapability(providerId, 'chat')) {
    throw new AiProviderError(`Provider ${provider.displayName} does not support chat.`);
  }
  if (!OPENAI_COMPATIBLE_ADAPTER_PROVIDERS.has(providerId) && !GEMINI_ADAPTER_PROVIDERS.has(providerId)) {
    throw new AiProviderError(`Provider adapter is not implemented yet: ${provider.displayName}`);
  }
}

export async function createChatCompletionWithRouting(
  settings: AiSettings,
  messages: ChatMessage[],
  options: AiCoreChatOptions = {},
): Promise<ChatResponse> {
  const route = routeChatRequest(settings, {
    taskType: options.taskType ?? 'chat',
    messages,
    model: options.model,
    stream: options.stream,
    temperature: options.temperature,
  });
  const attempts = [
    {
      providerId: route.providerId,
      accountId: route.accountId,
      model: route.model,
    },
    ...route.fallbackChain,
  ];
  const warnings: string[] = [];
  let lastError: unknown;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    let account: ResolvedAiAccount | undefined;
    try {
      assertAdapterAvailable(attempt.providerId);
      account = await resolveAccount(settings, attempt.accountId);
      const result =
        attempt.providerId === 'gemini'
          ? await createGeminiChatCompletion({
              account,
              model: attempt.model,
              messages,
              stream: Boolean(options.stream),
              temperature: options.temperature,
              signal: options.signal,
              onStreamEvent: options.onStreamEvent,
              onNetworkEvent: options.onNetworkEvent,
            })
          : await createOpenAiCompatibleChatCompletion({
              providerId: attempt.providerId,
              account,
              model: attempt.model,
              messages,
              stream: Boolean(options.stream),
              temperature: options.temperature,
              signal: options.signal,
              onStreamEvent: options.onStreamEvent,
              onNetworkEvent: options.onNetworkEvent,
            });
      if (options.recordHealth !== false) {
        markAccountSuccess(account);
      }

      return {
        content: result.content,
        usage: result.usage,
        providerId: attempt.providerId,
        accountId: attempt.accountId,
        model: attempt.model,
        createdAt: new Date().toISOString(),
        warnings,
      };
    } catch (error) {
      lastError = error;
      if (account && options.recordHealth !== false) {
        markAccountFailure(account, error);
        markModelLock(account, attempt.model, error);
      }
      const canFallback = index < attempts.length - 1 && isRetryableProviderError(error);
      console.error('[ai-core] route attempt failed', JSON.stringify({
        attemptIndex: index,
        willFallback: canFallback,
        providerId: attempt.providerId,
        accountId: attempt.accountId,
        accountDisplayName: account?.displayName,
        authMethod: account?.authMethod,
        model: attempt.model,
        error: errorDetails(error),
      }, null, 2));
      if (!canFallback) break;
      warnings.push(error instanceof Error ? error.message : 'AI provider failed; trying fallback route.');
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new AiProviderError('AI routing failed before any provider returned a response.');
}
