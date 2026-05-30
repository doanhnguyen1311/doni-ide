import crypto from 'node:crypto';
import type { AiNetworkEvent, ChatMessage, ChatStreamEvent } from '../../shared/types';
import type { ResolvedAiAccount } from './accountManager';
import { AiProviderError } from './errors';

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: 'user' | 'model';
  parts?: GeminiPart[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: unknown;
  error?: {
    message?: string;
  };
}

export interface GeminiChatRequest {
  account: ResolvedAiAccount;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  signal?: AbortSignal;
  onStreamEvent?: (event: ChatStreamEvent) => void;
  onNetworkEvent?: (event: AiNetworkEvent) => void;
}

export interface GeminiChatResponse {
  content: string;
  usage?: unknown;
}

function normalizeGeminiModel(model: string): string {
  return model.trim().replace(/^models\//, '');
}

function geminiGenerateContentUrl(apiBase: string, model: string): string {
  const normalizedBase = apiBase.trim().replace(/\/$/, '');
  return `${normalizedBase}/models/${encodeURIComponent(normalizeGeminiModel(model))}:generateContent`;
}

function toGeminiRole(role: ChatMessage['role']): GeminiContent['role'] {
  return role === 'assistant' ? 'model' : 'user';
}

function buildGeminiBody(messages: ChatMessage[], temperature?: number): string {
  const systemText = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n');
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.content }],
    }));

  return JSON.stringify({
    contents,
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    ...(typeof temperature === 'number' ? { generationConfig: { temperature } } : {}),
  });
}

function readGeminiContent(json: GeminiGenerateContentResponse, status: number): GeminiChatResponse {
  if (json.error?.message) {
    throw new AiProviderError(json.error.message, status);
  }

  const content =
    json.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('') ?? '';

  if (!content) {
    const finishReason = json.candidates?.find((candidate) => candidate.finishReason)?.finishReason;
    throw new AiProviderError(finishReason ? `Gemini returned no text. Finish reason: ${finishReason}.` : 'Gemini returned an empty response.', status);
  }

  return {
    content,
    usage: json.usageMetadata,
  };
}

function readHttpErrorDetail(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  try {
    return (JSON.parse(trimmed) as GeminiGenerateContentResponse).error?.message ?? fallback;
  } catch {
    return trimmed.slice(0, 160);
  }
}

function streamEventBase(request: GeminiChatRequest): Omit<ChatStreamEvent, 'type'> {
  return {
    timestamp: new Date().toISOString(),
    providerId: 'gemini',
    accountId: request.account.id,
    model: request.model,
  };
}

export async function createGeminiChatCompletion(request: GeminiChatRequest): Promise<GeminiChatResponse> {
  const url = geminiGenerateContentUrl(request.account.apiBase, request.model);
  const body = buildGeminiBody(request.messages, request.temperature);
  const startedAtMs = Date.now();
  const baseEvent = {
    id: crypto.randomUUID(),
    startedAt: new Date(startedAtMs).toISOString(),
    method: 'POST' as const,
    url,
    model: request.model,
    requestBytes: Buffer.byteLength(body, 'utf8'),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...request.account.authHeaders,
      },
      body,
      signal: request.signal,
    });

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

    if (!response.ok) {
      const detail = readHttpErrorDetail(text, response.statusText);
      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError('Gemini request is not authorized.', response.status);
      }
      throw new AiProviderError(`Gemini API error: ${detail}`, response.status);
    }

    let json: GeminiGenerateContentResponse;
    try {
      json = JSON.parse(text) as GeminiGenerateContentResponse;
    } catch {
      throw new AiProviderError('Gemini returned non-JSON data.', response.status);
    }

    const result = readGeminiContent(json, response.status);
    if (request.stream) {
      const base = streamEventBase(request);
      request.onStreamEvent?.({ ...base, type: 'start' });
      request.onStreamEvent?.({ ...base, type: 'text_delta', delta: result.content });
      if (result.usage) {
        request.onStreamEvent?.({ ...base, type: 'usage', usage: result.usage });
      }
      request.onStreamEvent?.({ ...base, type: 'done' });
    }

    return result;
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
    throw new AiProviderError('Could not connect to the Gemini API. Check the API base URL and service status.', undefined, true);
  }
}
