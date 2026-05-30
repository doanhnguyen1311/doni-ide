import http from 'node:http';
import type { AiAuthMethodId, ProviderAuthFlowResponse } from '../../shared/types';

export interface OAuthLoopbackCallback {
  providerId?: string;
  authMethod?: AiAuthMethodId;
  code?: string;
  state?: string;
  error?: string;
}

export interface StartOAuthLoopbackServerRequest {
  providerId: string;
  authMethod: AiAuthMethodId;
  ttlMs: number;
  onCallback: (callback: OAuthLoopbackCallback) => Promise<ProviderAuthFlowResponse>;
  onClose?: (reason: OAuthLoopbackCloseReason) => void;
}

export type OAuthLoopbackCloseReason = 'completed' | 'timeout' | 'cancelled' | 'closed';

export interface OAuthLoopbackServerHandle {
  redirectUri: string;
  close: (reason?: OAuthLoopbackCloseReason) => void;
}

function writeHtml(response: http.ServerResponse, statusCode: number, title: string, body: string): void {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(`<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>${body}</p></body></html>`);
}

export async function startOAuthLoopbackServer(request: StartOAuthLoopbackServerRequest): Promise<OAuthLoopbackServerHandle> {
  let closed = false;
  let timeout: NodeJS.Timeout | undefined;
  const server = http.createServer(async (incoming, response) => {
    let url: URL;
    try {
      url = new URL(incoming.url ?? '', 'http://127.0.0.1');
    } catch {
      writeHtml(response, 404, 'Not Found', 'This local endpoint only handles the active OAuth callback.');
      return;
    }

    if (incoming.method !== 'GET' || url.pathname !== '/oauth/callback') {
      writeHtml(response, 404, 'Not Found', 'This local endpoint only handles the active OAuth callback.');
      return;
    }

    try {
      const result = await request.onCallback({
        providerId: request.providerId,
        authMethod: request.authMethod,
        code: url.searchParams.get('code') ?? undefined,
        state: url.searchParams.get('state') ?? undefined,
        error: url.searchParams.get('error') ?? undefined,
      });
      if (result.ok) {
        writeHtml(response, 200, 'Doni sign-in complete', 'You can return to Doni IDE.');
      } else {
        writeHtml(response, 400, 'Doni sign-in failed', result.message ?? 'The OAuth flow could not be completed.');
      }
    } catch (error) {
      writeHtml(response, 500, 'Doni sign-in failed', error instanceof Error ? error.message : 'The OAuth flow could not be completed.');
    } finally {
      close('completed');
    }
  });

  const close = (reason: OAuthLoopbackCloseReason = 'closed'): void => {
    if (closed) return;
    closed = true;
    if (timeout) clearTimeout(timeout);
    request.onClose?.(reason);
    server.close(() => undefined);
  };

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  timeout = setTimeout(() => close('timeout'), request.ttlMs);
  timeout.unref?.();
  const address = server.address();
  if (!address || typeof address === 'string') {
    close();
    throw new Error('Could not start local OAuth callback server.');
  }

  return {
    redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
    close,
  };
}
