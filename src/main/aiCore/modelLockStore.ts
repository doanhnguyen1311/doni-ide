import type { AiModelLockRecord, AiProviderAccount } from '../../shared/types';
import { AiProviderError } from './errors';

const locks = new Map<string, AiModelLockRecord>();

function lockKey(accountId: string, model: string): string {
  return `${accountId}:${model}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function getModelLock(accountId: string, model: string): AiModelLockRecord | undefined {
  const record = locks.get(lockKey(accountId, model));
  if (!record) return undefined;
  if (Date.parse(record.lockedUntil) <= Date.now()) {
    locks.delete(lockKey(accountId, model));
    return undefined;
  }
  return { ...record };
}

export function isModelLockedForAccount(accountId: string, model: string): boolean {
  return Boolean(getModelLock(accountId, model));
}

function isModelSpecificError(error: AiProviderError): boolean {
  const message = error.message.toLowerCase();
  return (
    /unsupported\s+model|model.*unsupported/.test(message) ||
    /model.*not\s+found|not\s+found.*model/.test(message) ||
    /model.*unavailable|unavailable.*model/.test(message) ||
    /model.*disabled|disabled.*model/.test(message)
  );
}

export function markModelLock(account: AiProviderAccount, model: string, error: unknown): AiModelLockRecord | undefined {
  if (!(error instanceof AiProviderError)) return undefined;
  if (!isModelSpecificError(error)) return undefined;

  const lockMs = 60 * 60 * 1000;
  const updatedAt = nowIso();
  const record: AiModelLockRecord = {
    accountId: account.id,
    providerId: account.providerId,
    model,
    lockedUntil: new Date(Date.now() + lockMs).toISOString(),
    reason: error.message,
    updatedAt,
  };
  locks.set(lockKey(account.id, model), record);
  return { ...record };
}

export function clearModelLock(accountId: string, model: string): void {
  locks.delete(lockKey(accountId, model));
}
