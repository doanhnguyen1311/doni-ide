import type { ChatStreamEvent } from '../../shared/types';
import { AiProviderError } from './errors';

interface OpenAiCompatibleChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: unknown;
    };
    message?: {
      content?: string;
    };
  }>;
  usage?: unknown;
  error?: {
    message?: string;
  };
}

export interface OpenAiStreamResult {
  content: string;
  usage?: unknown;
  responseBytes: number;
}

export interface OpenAiStreamMetadata {
  providerId: string;
  accountId: string;
  model: string;
}

function eventBase(metadata: OpenAiStreamMetadata): Omit<ChatStreamEvent, 'type'> {
  return {
    timestamp: new Date().toISOString(),
    providerId: metadata.providerId,
    accountId: metadata.accountId,
    model: metadata.model,
  };
}

function readChunkText(chunk: OpenAiCompatibleChunk): string {
  return chunk.choices?.map((choice) => choice.delta?.content ?? choice.message?.content ?? '').join('') ?? '';
}

function readReasoningText(chunk: OpenAiCompatibleChunk): string {
  return chunk.choices?.map((choice) => choice.delta?.reasoning_content ?? '').join('') ?? '';
}

function parseOpenAiPayload(
  payload: string,
  status: number,
  metadata: OpenAiStreamMetadata,
  onEvent: (event: ChatStreamEvent) => void,
): { contentDelta: string; usage?: unknown; done: boolean } {
  const trimmed = payload.trim();
  if (!trimmed) return { contentDelta: '', done: false };
  if (trimmed === '[DONE]') return { contentDelta: '', done: true };

  let chunk: OpenAiCompatibleChunk;
  try {
    chunk = JSON.parse(trimmed) as OpenAiCompatibleChunk;
  } catch {
    throw new AiProviderError(`AI stream returned non-JSON data: ${trimmed.slice(0, 120)}`, status);
  }

  if (chunk.error?.message) {
    throw new AiProviderError(chunk.error.message, status);
  }

  const base = eventBase(metadata);
  const contentDelta = readChunkText(chunk);
  const reasoningDelta = readReasoningText(chunk);

  if (reasoningDelta) {
    onEvent({ ...base, type: 'reasoning_delta', delta: reasoningDelta });
  }
  if (contentDelta) {
    onEvent({ ...base, type: 'text_delta', delta: contentDelta });
  }
  if (chunk.usage) {
    onEvent({ ...base, type: 'usage', usage: chunk.usage });
  }

  return {
    contentDelta,
    usage: chunk.usage,
    done: false,
  };
}

export async function readOpenAiCompatibleStream(
  response: Response,
  metadata: OpenAiStreamMetadata,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<OpenAiStreamResult> {
  const base = eventBase(metadata);
  onEvent({ ...base, type: 'start' });

  if (!response.body) {
    const text = await response.text();
    const parsed = parseOpenAiPayload(text, response.status, metadata, onEvent);
    onEvent({ ...base, type: 'done' });
    return {
      content: parsed.contentDelta,
      usage: parsed.usage,
      responseBytes: Buffer.byteLength(text, 'utf8'),
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage: unknown;
  let parsedAnyEvent = false;
  let responseBytes = 0;
  let sawDone = false;

  const drainLines = (isFinal = false): void => {
    const lines = buffer.split(/\r?\n/);
    buffer = isFinal ? '' : (lines.pop() ?? '');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || /^(event|id|retry):/i.test(line) || line.startsWith(':')) continue;
      const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
      const parsed = parseOpenAiPayload(payload, response.status, metadata, onEvent);
      if (parsed.done) {
        sawDone = true;
        continue;
      }
      parsedAnyEvent = true;
      content += parsed.contentDelta;
      usage = parsed.usage ?? usage;
    }

    if (isFinal && buffer.trim()) {
      const line = buffer.trim();
      if (!/^(event|id|retry):/i.test(line) && !line.startsWith(':')) {
        const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
        const parsed = parseOpenAiPayload(payload, response.status, metadata, onEvent);
        sawDone = parsed.done || sawDone;
        parsedAnyEvent = parsedAnyEvent || !parsed.done;
        content += parsed.contentDelta;
        usage = parsed.usage ?? usage;
      }
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

  if (!parsedAnyEvent && !sawDone) {
    onEvent({ ...base, type: 'error', error: 'AI stream returned no events.' });
    throw new AiProviderError('AI stream returned no events.', response.status);
  }

  onEvent({ ...base, type: 'done' });
  return { content, usage, responseBytes };
}
