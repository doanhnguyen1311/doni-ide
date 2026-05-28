import { BrowserWindow } from 'electron';
import crypto from 'node:crypto';
import type { AiSettings } from '../shared/types';
import { validateAiSettings } from './aiSettingsService';
import type { AiNetworkEvent } from '../shared/types';

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

interface ChatCompletionOptions {
  onContentDelta?: (chunk: string) => void;
}

const MAX_NETWORK_EVENTS = 100;
const networkEvents: AiNetworkEvent[] = [];
const activeControllers = new Set<AbortController>();

function rememberNetworkEvent(event: AiNetworkEvent): void {
  networkEvents.unshift(event);
  if (networkEvents.length > MAX_NETWORK_EVENTS) {
    networkEvents.splice(MAX_NETWORK_EVENTS);
  }
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('ai:networkEvent', event);
  }
}

export function listAiNetworkEvents(): AiNetworkEvent[] {
  return [...networkEvents];
}

export function clearAiNetworkEvents(): void {
  networkEvents.splice(0);
}

function readCompletionContent(json: ChatCompletionResponse): string {
  return json.choices?.map((choice) => choice.message?.content ?? choice.delta?.content ?? '').join('') ?? '';
}

function parseChatCompletionBody(text: string, status: number): ChatCompletionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AiApiError('AI API trả về phản hồi rỗng.', status);
  }

  const jsonCandidate = trimmed.replace(/\s*data:\s*\[DONE\]\s*$/i, '');

  try {
    const json = JSON.parse(jsonCandidate) as ChatCompletionResponse;
    const content = readCompletionContent(json);
    if (!content) {
      throw new AiApiError('AI API trả về phản hồi rỗng.', status);
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
      throw new AiApiError('AI API trả về phản hồi không phải JSON.', status);
    }
  }

  if (!parsedAnyEvent) {
    throw new AiApiError('AI API trả về phản hồi không phải JSON.', status);
  }
  if (!content) {
    throw new AiApiError('AI API trả về phản hồi rỗng.', status);
  }

  return { content, usage };
}

async function readStreamingCompletionBody(
  response: Response,
  status: number,
  onContentDelta: (chunk: string) => void,
): Promise<ChatCompletionResult & { responseBytes: number }> {
  if (!response.body) {
    const text = await response.text();
    const result = parseChatCompletionBody(text, status);
    onContentDelta(result.content);
    return { ...result, responseBytes: Buffer.byteLength(text, 'utf8') };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage: unknown;
  let parsedAnyEvent = false;
  let responseBytes = 0;

  const readPayload = (payload: string): void => {
    const trimmed = payload.trim();
    if (!trimmed || trimmed === '[DONE]') return;
    try {
      const json = JSON.parse(trimmed) as ChatCompletionResponse;
      parsedAnyEvent = true;
      const delta = readCompletionContent(json);
      if (delta) {
        content += delta;
        onContentDelta(delta);
      }
      usage = json.usage ?? usage;
    } catch {
      throw new AiApiError('AI API trả về phản hồi stream không phải JSON.', status);
    }
  };

  const drainLines = (isFinal = false): void => {
    const lines = buffer.split(/\r?\n/);
    buffer = isFinal ? '' : (lines.pop() ?? '');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      readPayload(line.startsWith('data:') ? line.slice(5) : line);
    }
    if (isFinal && buffer.trim()) {
      readPayload(buffer.startsWith('data:') ? buffer.slice(5) : buffer);
      buffer = '';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    responseBytes += value.byteLength;
    buffer += decoder.decode(value, { stream: true });
    drainLines();
  }
  buffer += decoder.decode();
  drainLines(true);

  if (!parsedAnyEvent || !content) {
    throw new AiApiError('AI API trả về phản hồi stream rỗng.', status);
  }

  return { content, usage, responseBytes };
}

function readHttpErrorDetail(text: string, contentType: string | null, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  if (contentType?.includes('text/html') || /^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return 'Máy chủ AI trả về trang lỗi HTML thay vì JSON tương thích OpenAI. Hãy kiểm tra URL API Base, tên model và khởi động lại AI gateway cục bộ nếu cần.';
  }

  try {
    return (JSON.parse(trimmed) as ChatCompletionResponse).error?.message ?? fallback;
  } catch {
    return trimmed.slice(0, 160);
  }
}

export async function createChatCompletionResult(
  settings: AiSettings,
  messages: ChatMessage[],
  timeoutMs = 30000,
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  validateAiSettings(settings);
  if (/[^\x20-\x7E]/.test(settings.apiKey)) {
    throw new AiApiError('Khóa API chứa ký tự không được hỗ trợ. Hãy dùng khóa ASCII như "test" cho gateway cục bộ tương thích OpenAI.');
  }

  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${settings.apiBase.replace(/\/$/, '')}/chat/completions`;
  const body = JSON.stringify({ model: settings.model, messages, temperature: 0.4, stream: Boolean(options.onContentDelta) });
  const startedAtMs = Date.now();
  const baseEvent = {
    id: crypto.randomUUID(),
    startedAt: new Date(startedAtMs).toISOString(),
    method: 'POST' as const,
    url,
    model: settings.model,
    requestBytes: Buffer.byteLength(body, 'utf8'),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const finishedAtMs = Date.now();
      rememberNetworkEvent({
        ...baseEvent,
        finishedAt: new Date(finishedAtMs).toISOString(),
        status: response.status,
        ok: response.ok,
        durationMs: finishedAtMs - startedAtMs,
        responseBytes: Buffer.byteLength(text, 'utf8'),
      });
      const detail = readHttpErrorDetail(text, response.headers.get('content-type'), response.statusText);
      if (response.status === 401 || response.status === 403) {
        throw new AiApiError('Khóa API không hợp lệ hoặc request AI API chưa được cấp quyền.', response.status);
      }
      throw new AiApiError(`AI API error: ${detail}`, response.status);
    }

    if (options.onContentDelta) {
      const result = await readStreamingCompletionBody(response, response.status, options.onContentDelta);
      const finishedAtMs = Date.now();
      rememberNetworkEvent({
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
    rememberNetworkEvent({
      ...baseEvent,
      finishedAt: new Date(finishedAtMs).toISOString(),
      status: response.status,
      ok: response.ok,
      durationMs: finishedAtMs - startedAtMs,
      responseBytes: Buffer.byteLength(text, 'utf8'),
    });

    return parseChatCompletionBody(text, response.status);
  } catch (error) {
    if (!(error instanceof AiApiError)) {
      const finishedAtMs = Date.now();
      rememberNetworkEvent({
        ...baseEvent,
        finishedAt: new Date(finishedAtMs).toISOString(),
        ok: false,
        durationMs: finishedAtMs - startedAtMs,
        error: error instanceof Error ? error.message : 'Lỗi mạng không xác định.',
      });
    }
    if (error instanceof AiApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiApiError('Request AI API đã bị dừng hoặc quá thời gian. Hãy thử lại nếu cần.');
    }
    throw new AiApiError('Không thể kết nối AI API. Hãy kiểm tra URL API Base và dịch vụ có đang chạy không.');
  } finally {
    activeControllers.delete(controller);
    clearTimeout(timeout);
  }
}

export function cancelActiveAiRequests(): void {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
}

export async function createChatCompletion(settings: AiSettings, messages: ChatMessage[], timeoutMs = 30000): Promise<string> {
  const result = await createChatCompletionResult(settings, messages, timeoutMs);
  return result.content;
}

export async function testConnection(settings: AiSettings): Promise<boolean> {
  const content = await createChatCompletion(
    { ...settings, model: settings.plannerModel || settings.executorModel || settings.model },
    [
      { role: 'system', content: 'You are a connection test. Reply with OK only.' },
      { role: 'user', content: 'Reply with OK only.' },
    ],
    15000,
  );
  return content.trim().toUpperCase() === 'OK';
}
