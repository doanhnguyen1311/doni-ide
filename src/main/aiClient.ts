import type { AiSettings } from '../shared/types';
import { validateAiSettings } from './aiSettingsService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
  usage?: unknown;
  error?: { message?: string };
}

export class AiApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AiApiError';
  }
}

export interface ChatCompletionResult {
  content: string;
  usage?: unknown;
}

function readCompletionContent(json: ChatCompletionResponse): string {
  return json.choices?.map((choice) => choice.message?.content ?? choice.delta?.content ?? '').join('') ?? '';
}

function parseChatCompletionBody(text: string, status: number): ChatCompletionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AiApiError('AI API returned an empty response.', status);
  }

  const jsonCandidate = trimmed.replace(/\s*data:\s*\[DONE\]\s*$/i, '');

  try {
    const json = JSON.parse(jsonCandidate) as ChatCompletionResponse;
    const content = readCompletionContent(json);
    if (!content) {
      throw new AiApiError('AI API returned an empty response.', status);
    }
    return { content, usage: json.usage };
  } catch (error) {
    if (error instanceof AiApiError) throw error;
  }

  let content = '';
  let usage: unknown;
  let parsedAnyEvent = false;

  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === 'data: [DONE]' || line === '[DONE]') continue;

    const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
    if (!payload || payload === '[DONE]') continue;

    try {
      const json = JSON.parse(payload) as ChatCompletionResponse;
      parsedAnyEvent = true;
      content += readCompletionContent(json);
      usage = json.usage ?? usage;
    } catch {
      throw new AiApiError('AI API returned a non-JSON response.', status);
    }
  }

  if (!parsedAnyEvent) {
    throw new AiApiError('AI API returned a non-JSON response.', status);
  }
  if (!content) {
    throw new AiApiError('AI API returned an empty response.', status);
  }

  return { content, usage };
}

function readHttpErrorDetail(text: string, contentType: string | null, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  if (contentType?.includes('text/html') || /^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return 'AI server returned an HTML error page instead of an OpenAI-compatible JSON response. Check the API Base URL, model name, and restart the local AI gateway if needed.';
  }

  try {
    return (JSON.parse(trimmed) as ChatCompletionResponse).error?.message ?? fallback;
  } catch {
    return trimmed.slice(0, 160);
  }
}

export async function createChatCompletionResult(settings: AiSettings, messages: ChatMessage[], timeoutMs = 30000): Promise<ChatCompletionResult> {
  validateAiSettings(settings);
  if (/[^\x20-\x7E]/.test(settings.apiKey)) {
    throw new AiApiError('API Key contains unsupported characters. Use an ASCII key such as "test" for local OpenAI-compatible gateways.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: settings.model, messages, temperature: 0.4 }),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      const detail = readHttpErrorDetail(text, response.headers.get('content-type'), response.statusText);
      if (response.status === 401 || response.status === 403) {
        throw new AiApiError('Invalid API key or unauthorized AI API request.', response.status);
      }
      throw new AiApiError(`AI API error: ${detail}`, response.status);
    }

    return parseChatCompletionBody(text, response.status);
  } catch (error) {
    if (error instanceof AiApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiApiError('AI API request timed out. Please try again or check your local model.');
    }
    throw new AiApiError('Unable to reach AI API. Check API Base URL and whether the service is running.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function createChatCompletion(settings: AiSettings, messages: ChatMessage[], timeoutMs = 30000): Promise<string> {
  const result = await createChatCompletionResult(settings, messages, timeoutMs);
  return result.content;
}

export async function testConnection(settings: AiSettings): Promise<boolean> {
  const content = await createChatCompletion(
    settings,
    [
      { role: 'system', content: 'You are a connection test. Reply with OK only.' },
      { role: 'user', content: 'Reply with OK only.' },
    ],
    15000,
  );
  return content.trim().toUpperCase() === 'OK';
}
