import type { AiAccountHealthRecord, AiProviderAccount } from '../../shared/types';
import { AiProviderError } from './errors';

const healthByAccountId = new Map<string, AiAccountHealthRecord>();

function nowIso(): string {
  return new Date().toISOString();
}

function futureIso(value?: string): string | undefined {
  return value && Date.parse(value) > Date.now() ? value : undefined;
}

function normalizeRecord(record: AiAccountHealthRecord): AiAccountHealthRecord {
  const cooldownUntil = futureIso(record.cooldownUntil);
  return {
    ...record,
    cooldownUntil,
  };
}

function errorCode(error: unknown): string | undefined {
  if (error instanceof AiProviderError && typeof error.status === 'number') {
    return String(error.status);
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.match(/\b([1-5]\d{2})\b/)?.[1];
}

function cooldownMsForFailure(account: AiProviderAccount, failureCount: number, error: unknown): number {
  if (error instanceof AiProviderError && (error.status === 401 || error.status === 403)) {
    if (account.providerId === 'custom-endpoint' || account.providerId === 'openai-compatible') {
      return 0;
    }
    return 60 * 60 * 1000;
  }
  if (error instanceof AiProviderError && error.status === 429) {
    return Math.min(15 * 60 * 1000, 30_000 * Math.max(1, failureCount));
  }
  if (error instanceof AiProviderError && typeof error.status === 'number' && error.status >= 500) {
    return Math.min(5 * 60 * 1000, 10_000 * Math.max(1, failureCount));
  }
  return 0;
}

export function getAccountHealth(accountId: string): AiAccountHealthRecord | undefined {
  const record = healthByAccountId.get(accountId);
  if (!record) return undefined;
  const normalized = normalizeRecord(record);
  if (normalized.cooldownUntil !== record.cooldownUntil) {
    healthByAccountId.set(accountId, normalized);
  }
  return { ...normalized };
}

export function isAccountCoolingDown(accountId: string): boolean {
  return Boolean(getAccountHealth(accountId)?.cooldownUntil);
}

export function mergeAccountHealth(account: AiProviderAccount): AiProviderAccount {
  const record = getAccountHealth(account.id);
  if (!record) return account;
  const runtimeCooldown = futureIso(record.cooldownUntil);
  const accountCooldown = futureIso(account.cooldownUntil);

  return {
    ...account,
    status: runtimeCooldown || accountCooldown ? 'cooldown' : account.status === 'cooldown' ? 'active' : account.status,
    healthScore: record.healthScore,
    cooldownUntil: runtimeCooldown ?? accountCooldown,
    lastError: record.lastError ?? account.lastError,
    lastErrorCode: record.lastErrorCode ?? account.lastErrorCode,
    lastErrorTime: record.lastFailureAt ?? account.lastErrorTime,
  };
}

export function markAccountSuccess(account: AiProviderAccount): void {
  healthByAccountId.set(account.id, {
    accountId: account.id,
    providerId: account.providerId,
    healthScore: 1,
    failureCount: 0,
    lastSuccessAt: nowIso(),
    updatedAt: nowIso(),
  });
}

export function markAccountFailure(account: AiProviderAccount, error: unknown): AiAccountHealthRecord {
  const existing = healthByAccountId.get(account.id);
  const failureCount = (existing?.failureCount ?? 0) + 1;
  const cooldownMs = cooldownMsForFailure(account, failureCount, error);
  const healthScore = Math.max(0, Math.min(1, (existing?.healthScore ?? account.healthScore ?? 1) - 0.2));
  const updatedAt = nowIso();
  const record: AiAccountHealthRecord = {
    accountId: account.id,
    providerId: account.providerId,
    healthScore,
    failureCount,
    cooldownUntil: cooldownMs > 0 ? new Date(Date.now() + cooldownMs).toISOString() : futureIso(existing?.cooldownUntil),
    lastFailureAt: updatedAt,
    lastSuccessAt: existing?.lastSuccessAt,
    lastError: error instanceof Error ? error.message : 'Unknown AI provider error.',
    lastErrorCode: errorCode(error),
    updatedAt,
  };
  healthByAccountId.set(account.id, record);
  return { ...record };
}

export function clearAccountCooldown(accountId: string): void {
  const existing = healthByAccountId.get(accountId);
  if (!existing) return;
  healthByAccountId.set(accountId, {
    ...existing,
    cooldownUntil: undefined,
    updatedAt: nowIso(),
  });
}
