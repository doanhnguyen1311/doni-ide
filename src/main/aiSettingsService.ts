import { app } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AiAuthMethodId,
  AiModelSelection,
  AiProviderAccount,
  AiRoutingProfile,
  AiSettings,
  DeleteAiProviderAccountRequest,
  DoniModel,
  DoniModelCapabilities,
  UpsertAiProviderAccountRequest,
} from '../shared/types';
import { DEFAULT_VISIBLE_MODELS } from '../shared/modelCatalog';
import { defaultApiBaseForProvider, getProviderDefinition } from './aiCore/providerRegistry';
import { createSecretReference, deleteSecret, writeSecret } from './aiCore/secretStore';
import { ensureDoniHome, getDoniHomeFile } from './doniHome';

const SETTINGS_FILE = 'ai-settings.json';
const DEFAULT_MAX_CONTEXT_FILES = 10;
const DEFAULT_IGNORE_PATTERNS = ['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.doni'];

function emptyAiSettings(): AiSettings {
  return {
    apiBase: '',
    apiKey: '',
    model: '',
    plannerModel: '',
    executorModel: '',
    plannerModelIds: DEFAULT_VISIBLE_MODELS.gemini.map((modelId) => `gemini:${modelId}`),
    executorModelIds: [...DEFAULT_VISIBLE_MODELS.gemini.map((modelId) => `gemini:${modelId}`), 'codex-cli:codex-cli'],
    customModels: [],
    executorProvider: 'custom',
    visibleModels: { ...DEFAULT_VISIBLE_MODELS },
    maxContextFiles: DEFAULT_MAX_CONTEXT_FILES,
    ignorePatterns: DEFAULT_IGNORE_PATTERNS,
    autoBackup: true,
    diffMode: 'inline',
    codexSandbox: 'read-only',
  };
}

function normalizeCustomModels(settings: Partial<AiSettings>): string[] {
  const modelCandidates = [
    ...(Array.isArray(settings.customModels) ? settings.customModels : []),
    settings.model,
    settings.plannerModel,
    settings.executorModel,
  ];
  return Array.from(new Set(modelCandidates.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

function normalizeAuthMethod(method: unknown): AiAuthMethodId | undefined {
  return method === 'apiKey' ||
    method === 'oauthPkce' ||
    method === 'deviceCode' ||
    method === 'tokenImport' ||
    method === 'cookieSession' ||
    method === 'localNoAuth'
    ? method
    : undefined;
}

async function getSettingsPath(): Promise<string> {
  return getDoniHomeFile('settings', SETTINGS_FILE);
}

function getLegacySettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

async function readRawSettings(): Promise<Partial<AiSettings>> {
  const raw = await fs.readFile(await getSettingsPath(), 'utf8').catch(async (error) => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return fs.readFile(getLegacySettingsPath(), 'utf8');
  });
  return JSON.parse(raw) as Partial<AiSettings>;
}

function normalizeAccount(account: AiProviderAccount): AiProviderAccount {
  const apiKeyReference = account.credentialReferences?.apiKey ?? account.secretReference;
  return {
    id: account.id,
    providerId: account.providerId,
    displayName: account.displayName || account.id,
    authMethod: normalizeAuthMethod(account.authMethod),
    status: ['active', 'disabled', 'cooldown', 'invalid'].includes(account.status) ? account.status : 'active',
    priority: Number.isFinite(account.priority) ? account.priority : 100,
    healthScore: Number.isFinite(account.healthScore) ? account.healthScore : 1,
    cooldownUntil: account.cooldownUntil,
    lastError: account.lastError,
    lastErrorCode: account.lastErrorCode,
    lastErrorTime: account.lastErrorTime,
    quota: account.quota,
    lastUsed: account.lastUsed,
    secretReference: account.secretReference,
    credentialReferences: apiKeyReference ? { ...account.credentialReferences, apiKey: apiKeyReference } : account.credentialReferences,
    authState: account.authState,
    metadata: account.metadata,
    apiBase: account.apiBase?.trim().replace(/\/$/, ''),
    modelIds: Array.isArray(account.modelIds) ? account.modelIds.map((item) => item.trim()).filter(Boolean) : undefined,
  };
}

function normalizeAccounts(settings: Partial<AiSettings>): AiProviderAccount[] | undefined {
  if (!Array.isArray(settings.accounts)) return undefined;
  const accounts = settings.accounts
    .filter((account): account is AiProviderAccount => Boolean(account?.id && account.providerId))
    .map(normalizeAccount);
  return accounts.length ? accounts : undefined;
}

function normalizeModelSelection(value: unknown): AiModelSelection | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Partial<Record<keyof AiModelSelection, unknown>>;
  const providerId = typeof source.providerId === 'string' ? source.providerId.trim() : '';
  const accountId = typeof source.accountId === 'string' ? source.accountId.trim() : '';
  const modelId = typeof source.modelId === 'string' ? source.modelId.trim() : '';
  if (!providerId || !modelId) return undefined;
  return {
    providerId,
    ...(accountId ? { accountId } : {}),
    modelId,
  };
}

function normalizeRoutingProfiles(settings: Partial<AiSettings>): AiRoutingProfile[] | undefined {
  if (!Array.isArray(settings.routingProfiles)) return undefined;
  const profiles = settings.routingProfiles
    .filter((profile): profile is AiRoutingProfile => Boolean(profile?.taskType && profile.model?.trim()))
    .map((profile) => ({
      taskType: profile.taskType,
      providerId: profile.providerId,
      accountId: profile.accountId,
      model: profile.model.trim(),
      modelSelection: normalizeModelSelection(profile.modelSelection),
      fallbackProviderIds: Array.isArray(profile.fallbackProviderIds)
        ? profile.fallbackProviderIds.map((item) => item.trim()).filter(Boolean)
        : undefined,
    }));
  return profiles.length ? profiles : undefined;
}

function normalizeVisibleModels(settings: Partial<AiSettings>): Record<string, string[]> {
  const raw = settings.visibleModels;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_VISIBLE_MODELS };
  }

  return Object.fromEntries(
    Object.entries(raw)
      .filter(([providerId, modelIds]) => Boolean(providerId.trim()) && Array.isArray(modelIds))
      .map(([providerId, modelIds]) => [
        providerId.trim(),
        Array.from(new Set(modelIds.map((modelId) => modelId?.trim()).filter((modelId): modelId is string => Boolean(modelId)))),
      ]),
  );
}

function emptyModelCapabilities(): DoniModelCapabilities {
  return {
    chat: false,
    code: false,
    vision: false,
    imageInput: false,
    imageOutput: false,
    toolCalling: false,
    functionCalling: false,
    streaming: false,
    reasoning: false,
    embedding: false,
    rerank: false,
  };
}

function normalizeModelCapabilities(value: unknown): DoniModelCapabilities {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<keyof DoniModelCapabilities, unknown>>
    : {};
  const capabilities = emptyModelCapabilities();
  for (const key of Object.keys(capabilities) as Array<keyof DoniModelCapabilities>) {
    capabilities[key] = Boolean(source[key] ?? capabilities[key]);
  }
  return capabilities;
}

function normalizeModelLibrary(settings: Partial<AiSettings>): DoniModel[] | undefined {
  if (!Array.isArray(settings.modelLibrary)) return undefined;
  const byKey = new Map<string, DoniModel>();
  for (const item of settings.modelLibrary) {
    if (!item || typeof item.provider !== 'string' || typeof item.rawId !== 'string') continue;
    const provider = item.provider.trim();
    const rawId = item.rawId.trim();
    if (!provider || !rawId) continue;
    const accountId = typeof item.accountId === 'string' && item.accountId.trim() ? item.accountId.trim() : undefined;
    const key = `${provider}:${accountId ?? ''}:${rawId}`;
    byKey.set(key, {
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${provider}:${accountId ?? 'global'}:${rawId}`,
      provider,
      ...(accountId ? { accountId } : {}),
      ...(typeof item.accountName === 'string' && item.accountName.trim() ? { accountName: item.accountName.trim() } : {}),
      displayName: (typeof item.displayName === 'string' && item.displayName.trim()) || rawId,
      rawId,
      ...(typeof item.family === 'string' && item.family.trim() ? { family: item.family.trim() } : {}),
      ...(typeof item.description === 'string' && item.description.trim() ? { description: item.description.trim() } : {}),
      capabilities: normalizeModelCapabilities(item.capabilities),
      ...(item.limits ? { limits: item.limits } : {}),
      ...(item.pricing ? { pricing: item.pricing } : {}),
      availability: {
        available: item.availability?.available !== false,
        ...(item.availability?.reason ? { reason: item.availability.reason } : {}),
        source: item.availability?.source ?? 'local',
      },
      ...(typeof item.fetchedAt === 'string' && item.fetchedAt.trim() ? { fetchedAt: item.fetchedAt.trim() } : {}),
      ...(item.raw !== undefined ? { raw: item.raw } : {}),
    });
  }
  const models = [...byKey.values()];
  return models.length ? models : undefined;
}

function normalizeModelSelectorIds(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const ids = Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)));
  return ids.length ? ids : [...fallback];
}

function normalizeAiSettings(settings: Partial<AiSettings>): AiSettings {
  const model = (settings.model ?? '').trim();
  const plannerModel = (settings.plannerModel || model).trim();
  const executorModel = (settings.executorModel || model).trim();
  const defaultPlannerModelIds = DEFAULT_VISIBLE_MODELS.gemini.map((modelId) => `gemini:${modelId}`);
  const defaultExecutorModelIds = [...defaultPlannerModelIds, 'codex-cli:codex-cli'];

  return {
    ...emptyAiSettings(),
    apiBase: (settings.apiBase ?? '').trim().replace(/\/$/, ''),
    apiKey: '',
    secretReference: settings.secretReference?.trim() || undefined,
    model: executorModel,
    plannerModel,
    executorModel,
    plannerModelSelection: normalizeModelSelection(settings.plannerModelSelection),
    executorModelSelection: normalizeModelSelection(settings.executorModelSelection),
    plannerModelIds: normalizeModelSelectorIds(settings.plannerModelIds, defaultPlannerModelIds),
    executorModelIds: normalizeModelSelectorIds(settings.executorModelIds, defaultExecutorModelIds),
    customModels: normalizeCustomModels({ ...settings, plannerModel, executorModel, model: executorModel }),
    executorProvider: settings.executorProvider === 'codex' ? 'codex' : 'custom',
    selectedAccountId: settings.selectedAccountId?.trim() || undefined,
    accounts: normalizeAccounts(settings),
    routingProfiles: normalizeRoutingProfiles(settings),
    modelLibrary: normalizeModelLibrary(settings),
    visibleModels: normalizeVisibleModels(settings),
    routingFallbackEnabled: settings.routingFallbackEnabled !== false,
    maxContextFiles: Math.max(1, Math.min(30, Math.round(settings.maxContextFiles || DEFAULT_MAX_CONTEXT_FILES))),
    ignorePatterns: settings.ignorePatterns?.map((item) => item.trim()).filter(Boolean) ?? DEFAULT_IGNORE_PATTERNS,
    autoBackup: settings.autoBackup !== false,
    diffMode: settings.diffMode === 'split' ? 'split' : 'inline',
    codexSandbox: settings.codexSandbox === 'workspace-write' ? 'workspace-write' : 'read-only',
  };
}

async function writeSanitizedSettings(settings: AiSettings): Promise<void> {
  await ensureDoniHome();
  await fs.writeFile(await getSettingsPath(), JSON.stringify({ ...settings, apiKey: '' }, null, 2), 'utf8');
}

async function migrateLegacyApiKey(parsed: Partial<AiSettings>, normalized: AiSettings): Promise<AiSettings> {
  const legacyApiKey = parsed.apiKey?.trim();
  if (!legacyApiKey) return normalized;

  const secretReference = normalized.secretReference || createSecretReference('secret_ref_ai');
  await writeSecret(secretReference, legacyApiKey);
  const migrated = {
    ...normalized,
    apiKey: '',
    secretReference,
  };
  await writeSanitizedSettings(migrated);
  return migrated;
}

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const parsed = await readRawSettings();
    return await migrateLegacyApiKey(parsed, normalizeAiSettings(parsed));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return emptyAiSettings();
    }
    throw error;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<AiSettings> {
  let existing: Partial<AiSettings> = {};
  try {
    existing = await readRawSettings();
  } catch {
    existing = {};
  }

  let secretReference = settings.secretReference?.trim() || existing.secretReference?.trim() || undefined;
  const nextApiKey = settings.apiKey.trim();
  if (nextApiKey) {
    secretReference = secretReference || createSecretReference('secret_ref_ai');
    await writeSecret(secretReference, nextApiKey);
  }

  const normalized = normalizeAiSettings({
    ...settings,
    apiKey: '',
    secretReference,
  });

  await writeSanitizedSettings(normalized);
  return normalized;
}

export async function upsertAiProviderAccount(request: UpsertAiProviderAccountRequest): Promise<AiSettings> {
  const settings = await getAiSettings();
  const accounts = [...(settings.accounts ?? [])];
  const existingIndex = request.accountId ? accounts.findIndex((account) => account.id === request.accountId) : -1;
  const existing = existingIndex >= 0 ? accounts[existingIndex] : undefined;
  let secretReference = request.secretReference?.trim() || existing?.credentialReferences?.apiKey || existing?.secretReference;

  const apiKey = request.apiKey?.trim() ?? '';
  if (apiKey) {
    secretReference = secretReference || createSecretReference('secret_ref_account');
    await writeSecret(secretReference, apiKey);
  }

  const account: AiProviderAccount = normalizeAccount({
    id: existing?.id ?? request.accountId ?? `account_${crypto.randomUUID()}`,
    providerId: request.providerId,
    displayName: request.displayName.trim() || request.providerId,
    authMethod: normalizeAuthMethod(request.authMethod) ?? existing?.authMethod,
    status: request.status ?? existing?.status ?? 'active',
    priority: request.priority ?? existing?.priority ?? 100,
    healthScore: request.healthScore ?? existing?.healthScore ?? 1,
    secretReference,
    credentialReferences: secretReference ? { ...existing?.credentialReferences, apiKey: secretReference } : existing?.credentialReferences,
    authState: {
      ...existing?.authState,
      configured: Boolean(secretReference) || getProviderDefinition(request.providerId)?.authType === 'none',
    },
    apiBase: request.apiBase,
    modelIds: request.modelIds,
    lastUsed: existing?.lastUsed,
    quota: existing?.quota,
    cooldownUntil: existing?.cooldownUntil,
  });

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  const modelIds = account.modelIds ?? [];
  const firstModel = modelIds[0] ?? settings.model;
  const firstModelSelection = firstModel
    ? {
        providerId: account.providerId,
        accountId: account.id,
        modelId: firstModel,
      }
    : undefined;
  const nextSettings = await saveAiSettings({
    ...settings,
    accounts,
    selectedAccountId: request.makeDefault || !settings.selectedAccountId ? account.id : settings.selectedAccountId,
    apiBase: settings.apiBase || account.apiBase || '',
    model: settings.model || firstModel,
    plannerModel: settings.plannerModel || firstModel,
    executorModel: settings.executorModel || firstModel,
    plannerModelSelection: settings.plannerModelSelection ?? firstModelSelection,
    executorModelSelection: settings.executorModelSelection ?? firstModelSelection,
    customModels: Array.from(new Set([...settings.customModels, ...modelIds].filter(Boolean))),
  });
  return nextSettings;
}

export async function deleteAiProviderAccount(request: DeleteAiProviderAccountRequest): Promise<AiSettings> {
  const settings = await getAiSettings();
  const account = settings.accounts?.find((item) => item.id === request.accountId);
  const secretReferences = new Set(
    [
      account?.credentialReferences?.apiKey,
      account?.credentialReferences?.accessToken,
      account?.credentialReferences?.refreshToken,
      account?.credentialReferences?.oauthClientSecret,
      account?.credentialReferences?.cookie,
      account?.credentialReferences?.copilotToken,
      account?.secretReference,
    ].filter((item): item is string => Boolean(item)),
  );
  for (const secretReference of secretReferences) {
    await deleteSecret(secretReference);
  }
  const accounts = (settings.accounts ?? []).filter((item) => item.id !== request.accountId);
  const selectedAccountId = settings.selectedAccountId === request.accountId ? accounts[0]?.id : settings.selectedAccountId;
  const plannerModelSelection =
    settings.plannerModelSelection?.accountId === request.accountId ? undefined : settings.plannerModelSelection;
  const executorModelSelection =
    settings.executorModelSelection?.accountId === request.accountId ? undefined : settings.executorModelSelection;

  return await saveAiSettings({
    ...settings,
    accounts,
    selectedAccountId,
    plannerModelSelection,
    executorModelSelection,
  });
}

export function validateAiSettings(settings: AiSettings): void {
  const hasModel = Boolean((settings.model || settings.plannerModel || settings.executorModel).trim());
  const hasLegacyEndpoint = Boolean(settings.apiBase.trim());
  const hasAccountEndpoint = Boolean(
    settings.accounts?.some(
      (account) =>
        account.apiBase ||
        Boolean(defaultApiBaseForProvider(account.providerId)),
    ),
  );
  const hasCredential = Boolean(
    settings.apiKey.trim() ||
      settings.secretReference?.trim() ||
      settings.accounts?.some(
        (account) =>
          account.credentialReferences?.apiKey ||
          account.credentialReferences?.accessToken ||
          account.secretReference ||
          getProviderDefinition(account.providerId)?.authType === 'none',
      ),
  );

  if (!hasLegacyEndpoint && !hasAccountEndpoint) {
    throw new Error('Thiếu cài đặt AI. Hãy điền URL API Base hoặc cấu hình ít nhất một provider account.');
  }
  if (!hasCredential) {
    throw new Error('Thiếu cài đặt AI. Hãy nhập API key để lưu vào Secret Store hoặc chọn account local không cần key.');
  }
  if (!hasModel) {
    throw new Error('Thiếu cài đặt AI. Hãy điền ít nhất một tên model.');
  }
}
