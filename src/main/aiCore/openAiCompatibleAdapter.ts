import crypto from 'node:crypto';
import type { AiNetworkEvent, ChatMessage, ChatStreamEvent } from '../../shared/types';
import type { ResolvedAiAccount } from './accountManager';
import { AiProviderError } from './errors';
import { readOpenAiCompatibleStream } from './streamingEngine';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
  usage?: unknown;
  error?: { message?: string };
}

export interface AdapterChatRequest {
  providerId: string;
  account: ResolvedAiAccount;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  signal?: AbortSignal;
  onStreamEvent?: (event: ChatStreamEvent) => void;
  onNetworkEvent?: (event: AiNetworkEvent) => void;
}

export interface AdapterChatResponse {
  content: string;
  usage?: unknown;
}

function readCompletionContent(json: ChatCompletionResponse): string {
  return json.choices?.map((choice) => choice.message?.content ?? choice.delta?.content ?? '').join('') ?? '';
}

function parseChatCompletionBody(text: string, status: number): AdapterChatResponse {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AiProviderError('AI API returned an empty response.', status);
  }

  const jsonCandidate = trimmed.replace(/\s*data:\s*\[DONE\]\s*$/i, '');

  try {
    const json = JSON.parse(jsonCandidate) as ChatCompletionResponse;
    if (json.error?.message) {
      throw new AiProviderError(json.error.message, status);
    }
    const content = readCompletionContent(json);
    if (!content) {
      throw new AiProviderError('AI API returned an empty response.', status);
    }
    return { content, usage: json.usage };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
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
      if (json.error?.message) {
        throw new AiProviderError(json.error.message, status);
      }
      parsedAnyEvent = true;
      content += readCompletionContent(json);
      usage = json.usage ?? usage;
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError('AI API returned non-JSON data.', status);
    }
  }

  if (!parsedAnyEvent) {
    throw new AiProviderError('AI API returned non-JSON data.', status);
  }
  if (!content) {
    throw new AiProviderError('AI API returned an empty response.', status);
  }

  return { content, usage };
}

function readHttpErrorDetail(text: string, contentType: string | null, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  if (contentType?.includes('text/html') || /^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return 'AI server returned an HTML error page. Check the API base URL, model name, and local gateway status.';
  }

  try {
    return (JSON.parse(trimmed) as ChatCompletionResponse).error?.message ?? fallback;
  } catch {
    return trimmed.slice(0, 160);
  }
}

function chatCompletionsUrl(apiBase: string): string {
  const normalized = apiBase.trim().replace(/\/$/, '');
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`;
}

function toOpenAiMessages(messages: ChatMessage[]): Array<Record<string, string>> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.name ? { name: message.name } : {}),
    ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
  }));
}

export async function createOpenAiCompatibleChatCompletion(request: AdapterChatRequest): Promise<AdapterChatResponse> {
  const url = chatCompletionsUrl(request.account.apiBase);
  const body = JSON.stringify({
    model: request.model,
    messages: toOpenAiMessages(request.messages),
    temperature: request.temperature ?? 0.4,
    stream: request.stream,
  });
  const startedAtMs = Date.now();
  const baseEvent = {
    id: crypto.randomUUID(),
    startedAt: new Date(startedAtMs).toISOString(),
    method: 'POST' as const,
    url,
    model: request.model,
    requestBytes: Buffer.byteLength(body, 'utf8'),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...request.account.authHeaders,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: request.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const finishedAtMs = Date.now();
      request.onNetworkEvent?.({
        ...baseEvent,
        finishedAt: new Date(finishedAtMs).toISOString(),
        status: response.status,
        ok: response.ok,
        durationMs: finishedAtMs - startedAtMs,
        responseBytes: Buffer.byteLength(text, 'utf8'),
      });

      const detail = readHttpErrorDetail(text, response.headers.get('content-type'), response.statusText);
      if (response.status === 401) {
        throw new AiProviderError('API key is invalid or this request is not authorized.', response.status);
      }
      if (response.status === 403) {
        throw new AiProviderError(`AI request is not authorized: ${detail}`, response.status);
      }
      throw new AiProviderError(`AI API error: ${detail}`, response.status);
    }

    if (request.stream) {
      const result = await readOpenAiCompatibleStream(
        response,
        {
          providerId: request.providerId,
          accountId: request.account.id,
          model: request.model,
        },
        (event) => request.onStreamEvent?.(event),
      );
      const finishedAtMs = Date.now();
      request.onNetworkEvent?.({
        ...baseEvent,
        finishedAt: new Date(finishedAtMs).toISOString(),
        status: response.status,
        ok: response.ok,
        durationMs: finishedAtMs - startedAtMs,
        responseBytes: result.responseBytes,
      });
      return { content: result.content, usage: result.usage };
    }

    const text = await response.text();
    const finishedAtMs = Date.now();
    request.onNetworkEvent?.({
      ...baseEvent,
      finishedAt: new Date(finishedAtMs).toISOString(),
      status: response.status,
      ok: response.ok,
      durationMs: finishedAtMs - startedAtMs,
      responseBytes: Buffer.byteLength(text, 'utf8'),
    });
    return parseChatCompletionBody(text, response.status);
  } catch (error) {
    if (!(error instanceof AiProviderError)) {
      const finishedAtMs = Date.now();
      request.onNetworkEvent?.({
        ...baseEvent,
        finishedAt: new Date(finishedAtMs).toISOString(),
        ok: false,
        durationMs: finishedAtMs - startedAtMs,
        error: error instanceof Error ? error.message : 'Unknown network error.',
      });
    }
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiProviderError('AI request was cancelled or timed out.', undefined, true);
    }
    throw new AiProviderError('Could not connect to the AI API. Check the API base URL and service status.', undefined, true);
  }
}
