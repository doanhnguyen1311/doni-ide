import type { AiModelSelection } from './types';

const ACCOUNT_MARKER = '@';

export function modelSelectionKey(selection: AiModelSelection): string {
  const providerId = selection.providerId.trim();
  const modelId = selection.modelId.trim();
  const accountId = selection.accountId?.trim();
  return accountId ? `${providerId}:${ACCOUNT_MARKER}${accountId}:${modelId}` : `${providerId}:${modelId}`;
}

export function createModelSelectionKey(providerId: string, modelId: string, accountId?: string): string {
  return modelSelectionKey({
    providerId,
    modelId,
    ...(accountId?.trim() ? { accountId: accountId.trim() } : {}),
  });
}

export function parseModelSelectionKey(key: string): AiModelSelection | undefined {
  const firstSeparator = key.indexOf(':');
  if (firstSeparator <= 0) return undefined;

  const providerId = key.slice(0, firstSeparator).trim();
  const rest = key.slice(firstSeparator + 1);
  if (!providerId || !rest.trim()) return undefined;

  if (rest.startsWith(ACCOUNT_MARKER)) {
    const secondSeparator = rest.indexOf(':');
    if (secondSeparator > 1) {
      const accountId = rest.slice(1, secondSeparator).trim();
      const modelId = rest.slice(secondSeparator + 1).trim();
      if (accountId && modelId) return { providerId, accountId, modelId };
    }
  }

  return {
    providerId,
    modelId: rest.trim(),
  };
}

export function legacyModelSelectionKey(providerId: string, modelId: string): string {
  return `${providerId.trim()}:${modelId.trim()}`;
}

