import type { AiProviderAccount, AiSettings } from '../../shared/types';
import { mergeAccountHealth } from './accountHealthStore';
import { isModelLockedForAccount } from './modelLockStore';
import { applyResolvedAuth, defaultAuthMethodForProvider, resolveProviderAuth } from './providerAuthAdapters';
import { defaultApiBaseForProvider } from './providerRegistry';

export interface ResolvedAiAccount extends AiProviderAccount {
  authHeaders: Record<string, string>;
  apiBase: string;
}

export function inferProviderId(settings: AiSettings): string {
  const apiBase = settings.apiBase.toLowerCase();
  if (apiBase.includes('api.openai.com')) return 'openai';
  if (apiBase.includes('openrouter.ai')) return 'openrouter';
  if (apiBase.includes('api.anthropic.com')) return 'anthropic';
  if (apiBase.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (apiBase.includes('localhost:11434') || apiBase.includes('127.0.0.1:11434')) return 'ollama';
  if (apiBase.includes('localhost:1234') || apiBase.includes('127.0.0.1:1234')) return 'lm-studio';
  return 'custom-endpoint';
}

function isCoolingDown(account: AiProviderAccount): boolean {
  return Boolean(account.cooldownUntil && Date.parse(account.cooldownUntil) > Date.now());
}

function effectiveAccountStatus(account: AiProviderAccount): AiProviderAccount['status'] {
  if (account.status === 'disabled' || account.status === 'invalid') return account.status;
  if (isCoolingDown(account)) return 'cooldown';
  return account.status === 'cooldown' ? 'active' : account.status;
}

export function listConfiguredAccounts(settings: AiSettings): AiProviderAccount[] {
  const configuredAccounts = Array.isArray(settings.accounts)
    ? settings.accounts.filter((account) => account.id && account.providerId)
    : [];
  const legacyProviderId = inferProviderId(settings);
  const apiBase = settings.apiBase.trim() || defaultApiBaseForProvider(legacyProviderId);
  const legacyAccount: AiProviderAccount | undefined =
    apiBase || settings.secretReference || settings.apiKey.trim()
      ? {
          id: 'legacy-openai-compatible',
          providerId: legacyProviderId,
          displayName: legacyProviderId === 'custom-endpoint' ? 'Custom Endpoint' : legacyProviderId,
          authMethod: defaultAuthMethodForProvider(legacyProviderId),
          status: 'active',
          priority: 100,
          healthScore: 1,
          secretReference: settings.secretReference,
          credentialReferences: settings.secretReference ? { apiKey: settings.secretReference } : undefined,
          apiBase,
          modelIds: [settings.model, settings.plannerModel, settings.executorModel].filter(Boolean),
        }
      : undefined;

  if (configuredAccounts.length) {
    const accounts = configuredAccounts.map((account) =>
      mergeAccountHealth({
        ...account,
        authMethod: account.authMethod ?? defaultAuthMethodForProvider(account.providerId),
        status: effectiveAccountStatus(account),
        priority: Number.isFinite(account.priority) ? account.priority : 100,
        healthScore: Number.isFinite(account.healthScore) ? account.healthScore : 1,
      }),
    );

    return accounts;
  }

  return legacyAccount ? [mergeAccountHealth(legacyAccount)] : [];
}

export function listRouteableAccounts(settings: AiSettings, providerId?: string, model?: string): AiProviderAccount[] {
  return listConfiguredAccounts(settings)
    .filter((account) => account.status === 'active')
    .filter((account) => !providerId || account.providerId === providerId)
    .filter((account) => !model || !isModelLockedForAccount(account.id, model))
    .sort((left, right) => {
      if (left.id === settings.selectedAccountId) return -1;
      if (right.id === settings.selectedAccountId) return 1;
      const priorityDelta = right.priority - left.priority;
      if (priorityDelta !== 0) return priorityDelta;
      return right.healthScore - left.healthScore;
    });
}

export async function resolveAccount(settings: AiSettings, accountId: string): Promise<ResolvedAiAccount> {
  const account = listConfiguredAccounts(settings).find((item) => item.id === accountId);
  if (!account) {
    throw new Error(`AI account not found: ${accountId}`);
  }

  const apiBase = account.apiBase?.trim() || defaultApiBaseForProvider(account.providerId) || settings.apiBase.trim();

  if (!apiBase) {
    throw new Error(`AI account ${account.displayName} does not have an API base URL.`);
  }
  if (account.status !== 'active') {
    throw new Error(`AI account ${account.displayName} is not active.`);
  }
  const auth = await resolveProviderAuth({ settings, account });
  const resolvedAuth = applyResolvedAuth(auth);

  return {
    ...account,
    authMethod: auth.method,
    apiBase,
    ...resolvedAuth,
  };
}
