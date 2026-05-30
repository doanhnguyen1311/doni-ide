import { BrowserWindow } from 'electron';
import type { AiSettings, AiTaskType, ChatMessage } from '../shared/types';
import { validateAiSettings } from './aiSettingsService';
import type { AiNetworkEvent } from '../shared/types';
import { createChatCompletionWithRouting } from './aiCore/aiCoreClient';
import { AiProviderError } from './aiCore/errors';

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
  stream?: boolean;
  taskType?: AiTaskType;
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
      throw new AiApiError(`AI API trả về phản hồi stream không phải JSON: ${trimmed.slice(0, 120)}`, status);
    }
  };

  const drainLines = (isFinal = false): void => {
    const lines = buffer.split(/\r?\n/);
    buffer = isFinal ? '' : (lines.pop() ?? '');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^(event|id|retry):/i.test(line) || line.startsWith(':')) continue;
      readPayload(line.startsWith('data:') ? line.slice(5) : line);
    }
    if (isFinal && buffer.trim()) {
      const line = buffer.trim();
      if (!/^(event|id|retry):/i.test(line) && !line.startsWith(':')) {
        readPayload(line.startsWith('data:') ? line.slice(5) : line);
      }
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
  if (settings.apiKey.trim() && /[^\x20-\x7E]/.test(settings.apiKey)) {
    throw new AiApiError('Khóa API chứa ký tự không được hỗ trợ. Hãy dùng khóa ASCII như "test" cho gateway cục bộ tương thích OpenAI.');
  }

  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const shouldStream = options.stream ?? Boolean(options.onContentDelta);

  try {
    const result = await createChatCompletionWithRouting(settings, messages, {
      model: settings.model,
      taskType: options.taskType,
      stream: shouldStream,
      signal: controller.signal,
      onNetworkEvent: rememberNetworkEvent,
      onStreamEvent: (event) => {
        if (event.type === 'text_delta' && event.delta) {
          options.onContentDelta?.(event.delta);
        }
      },
    });
    return { content: result.content, usage: result.usage };
  } catch (error) {
    if (error instanceof AiApiError) throw error;
    if (error instanceof AiProviderError) {
      throw new AiApiError(error.message, error.status);
    }
    if (error instanceof Error) {
      throw new AiApiError(error.message);
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
