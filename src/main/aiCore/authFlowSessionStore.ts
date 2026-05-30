import crypto from 'node:crypto';
import type { AiAuthMethodId, ProviderAuthFlowResponse } from '../../shared/types';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_SESSIONS = 100;

export interface DeviceCodeSessionMetadata {
  userCode?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  intervalSeconds?: number;
  deviceCode?: string;
}

export interface AuthFlowSession {
  id: string;
  providerId: string;
  authMethod: AiAuthMethodId;
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  state?: string;
  verifier?: string;
  redirectUri?: string;
  scopes?: string[];
  device?: DeviceCodeSessionMetadata;
  result?: ProviderAuthFlowResponse;
  createdAt: string;
  expiresAt: string;
}

export interface CreateAuthFlowSessionRequest {
  providerId: string;
  authMethod: AiAuthMethodId;
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  state?: string;
  verifier?: string;
  redirectUri?: string;
  scopes?: string[];
  device?: DeviceCodeSessionMetadata;
  result?: ProviderAuthFlowResponse;
  ttlMs?: number;
}

const sessions = new Map<string, AuthFlowSession>();
let cleanupTimer: NodeJS.Timeout | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function isExpired(session: AuthFlowSession): boolean {
  return Date.parse(session.expiresAt) <= Date.now();
}

export function cleanupExpiredAuthFlowSessions(): void {
  for (const [sessionId, session] of sessions) {
    if (isExpired(session)) {
      sessions.delete(sessionId);
    }
  }
}

function enforceMaxSessions(): void {
  if (sessions.size <= MAX_SESSIONS) return;
  const oldest = [...sessions.values()].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  for (const session of oldest.slice(0, sessions.size - MAX_SESSIONS)) {
    sessions.delete(session.id);
  }
}

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredAuthFlowSessions, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}

export function createAuthFlowSession(request: CreateAuthFlowSessionRequest): AuthFlowSession {
  ensureCleanupTimer();
  cleanupExpiredAuthFlowSessions();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + (request.ttlMs ?? DEFAULT_TTL_MS)).toISOString();
  const session: AuthFlowSession = {
    id: crypto.randomUUID(),
    providerId: request.providerId,
    authMethod: request.authMethod,
    accountId: request.accountId,
    clientId: request.clientId,
    clientSecret: request.clientSecret,
    state: request.state,
    verifier: request.verifier,
    redirectUri: request.redirectUri,
    scopes: request.scopes ? [...request.scopes] : undefined,
    device: request.device ? { ...request.device } : undefined,
    result: request.result ? { ...request.result } : undefined,
    createdAt,
    expiresAt,
  };
  sessions.set(session.id, session);
  enforceMaxSessions();
  return { ...session, scopes: session.scopes ? [...session.scopes] : undefined, device: session.device ? { ...session.device } : undefined };
}

export function getAuthFlowSession(sessionId: string): AuthFlowSession | undefined {
  cleanupExpiredAuthFlowSessions();
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  return { ...session, scopes: session.scopes ? [...session.scopes] : undefined, device: session.device ? { ...session.device } : undefined };
}

export function getAuthFlowSessionByState(state: string): AuthFlowSession | undefined {
  cleanupExpiredAuthFlowSessions();
  for (const session of sessions.values()) {
    if (session.state === state) {
      return { ...session, scopes: session.scopes ? [...session.scopes] : undefined, device: session.device ? { ...session.device } : undefined };
    }
  }
  return undefined;
}

export function getAuthFlowSessionByProviderFlow(providerId: string, authMethod: AiAuthMethodId): AuthFlowSession | undefined {
  cleanupExpiredAuthFlowSessions();
  const newest = [...sessions.values()]
    .filter((session) => session.providerId === providerId && session.authMethod === authMethod)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  return newest
    ? { ...newest, scopes: newest.scopes ? [...newest.scopes] : undefined, device: newest.device ? { ...newest.device } : undefined }
    : undefined;
}

export function updateAuthFlowSession(sessionId: string, partial: Partial<AuthFlowSession>): AuthFlowSession | undefined {
  cleanupExpiredAuthFlowSessions();
  const current = sessions.get(sessionId);
  if (!current) return undefined;
  const updated: AuthFlowSession = {
    ...current,
    ...partial,
    scopes: partial.scopes ? [...partial.scopes] : current.scopes,
    device: partial.device ? { ...partial.device } : current.device,
    result: partial.result ? { ...partial.result } : current.result,
  };
  sessions.set(sessionId, updated);
  return { ...updated, scopes: updated.scopes ? [...updated.scopes] : undefined, device: updated.device ? { ...updated.device } : undefined };
}

export function deleteAuthFlowSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
