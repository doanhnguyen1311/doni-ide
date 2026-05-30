import fs from 'node:fs/promises';
import type { AntiProviderAccount, AntiProviderState, DoniModel, DoniModelCapabilities } from '../shared/types';
import { NINE_ROUTER_MODEL_CATALOG, parseNineRouterModelTarget } from '../shared/nineRouterModelCatalog';
import { getAiSettings, saveAiSettings } from './aiSettingsService';
import { createSecretReference, readSecret, writeSecret } from './aiCore/secretStore';
import { getDoniHomeFile, getCodexHomeFile } from './doniHome';

const IMPORTED_PROVIDERS_FILE = 'anti-providers.json';

interface AntiConfig {
  authMode?: string;
  tokens?: {
    access_token?: string;
    refresh_token?: string;
    account_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

function logAntiProviderError(message: string, payload: Record<string, unknown>): void {
  console.error(`[anti-provider] ${message}`, JSON.stringify(payload, null, 2));
}

function capabilityDefaults(): DoniModelCapabilities {
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

function capabilitiesForModel(kind: string, rawId: string): DoniModelCapabilities {
  const id = rawId.toLowerCase();
  const capabilities = capabilityDefaults();
  if (kind === 'embedding') {
    capabilities.embedding = true;
    return capabilities;
  }
  if (kind === 'image') {
    capabilities.imageOutput = true;
    return capabilities;
  }
  if (kind === 'rerank') {
    capabilities.rerank = true;
    return capabilities;
  }
  if (kind === 'tts' || kind === 'stt') return capabilities;

  capabilities.chat = true;
  capabilities.streaming = true;
  capabilities.code = /code|coder|codex|claude|gpt|gemini|qwen|deepseek|llama/.test(id);
  capabilities.vision = /vision|vl|image/.test(id);
  capabilities.imageInput = capabilities.vision;
  capabilities.reasoning = /reason|thinking|o\d|gpt-5|opus|pro/.test(id);
  return capabilities;
}

function catalogEntryToDoniModel(entry: typeof NINE_ROUTER_MODEL_CATALOG[number]): DoniModel {
  return {
    id: `${entry.providerId}:library:${entry.id}`,
    provider: entry.providerId,
    displayName: entry.displayName,
    rawId: entry.id,
    family: entry.providerId,
    capabilities: capabilitiesForModel(entry.kind, entry.id),
    limits: entry.contextWindow ? { contextWindow: entry.contextWindow, inputTokenLimit: entry.contextWindow } : undefined,
    availability: {
      available: true,
      source: 'local',
      reason: 'Imported from 9router model catalog.',
    },
    fetchedAt: new Date().toISOString(),
    raw: {
      providerAlias: entry.providerAlias,
      kind: entry.kind,
      capabilities: entry.capabilities,
      targetFormat: entry.targetFormat,
      upstreamModelId: entry.upstreamModelId,
      quotaFamily: entry.quotaFamily,
      dimensions: entry.dimensions,
      source: '9router-catalog',
    },
  };
}

function aliasToDoniModel(alias: string, target: string): DoniModel | undefined {
  const parsed = parseNineRouterModelTarget(target);
  if (!parsed) return undefined;
  return {
    id: `${parsed.providerId}:alias:${alias}`,
    provider: parsed.providerId,
    displayName: alias,
    rawId: parsed.modelId,
    family: parsed.providerId,
    description: `9router alias for ${target}`,
    capabilities: capabilitiesForModel('llm', parsed.modelId),
    availability: {
      available: true,
      source: 'local',
      reason: 'Imported from 9router model alias.',
    },
    fetchedAt: new Date().toISOString(),
    raw: {
      providerAlias: parsed.providerAlias,
      alias,
      target,
      source: '9router-backup',
    },
  };
}

function mergeModelLibrary(existing: DoniModel[] | undefined, imported: DoniModel[]): DoniModel[] {
  const byKey = new Map<string, DoniModel>();
  for (const model of existing ?? []) {
    byKey.set(`${model.provider}:${model.accountId ?? ''}:${model.rawId}`, model);
  }
  for (const model of imported) {
    byKey.set(`${model.provider}:${model.accountId ?? ''}:${model.rawId}`, model);
  }
  return [...byKey.values()].sort((left, right) => {
    const providerDelta = left.provider.localeCompare(right.provider);
    if (providerDelta !== 0) return providerDelta;
    return left.displayName.localeCompare(right.displayName);
  });
}

async function importNineRouterModelsIntoDoniSettings(payload: unknown): Promise<number> {
  const importedModels = NINE_ROUTER_MODEL_CATALOG.map(catalogEntryToDoniModel);
  if (isRecord(payload) && isRecord(payload.modelAliases)) {
    for (const [alias, target] of Object.entries(payload.modelAliases)) {
      if (typeof target !== 'string') continue;
      const aliasModel = aliasToDoniModel(alias, target);
      if (aliasModel) importedModels.push(aliasModel);
    }
  }
  const settings = await getAiSettings();
  const modelLibrary = mergeModelLibrary(settings.modelLibrary, importedModels);
  await saveAiSettings({ ...settings, modelLibrary });
  return importedModels.length;
}

function parseAntiProviderAccount(value: unknown): AntiProviderAccount | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.account !== 'string'
  ) {
    return null;
  }
  const accessToken = typeof value.accessToken === 'string' ? value.accessToken : '';
  const refreshToken = typeof value.refreshToken === 'string' ? value.refreshToken : '';
  const accessTokenReference = typeof value.accessTokenReference === 'string' ? value.accessTokenReference : undefined;
  const refreshTokenReference = typeof value.refreshTokenReference === 'string' ? value.refreshTokenReference : undefined;
  if ((!accessToken && !accessTokenReference) || (!refreshToken && !refreshTokenReference)) return null;

  return {
    id: value.id,
    account: value.account,
    accessToken,
    refreshToken,
    accessTokenReference,
    refreshTokenReference,
    chatgptAccountId:
      (typeof value.chatgptAccountId === 'string' && value.chatgptAccountId) ||
      (typeof value.accountId === 'string' && value.accountId) ||
      undefined,
  };
}

async function sanitizeAntiProviderAccount(account: AntiProviderAccount): Promise<AntiProviderAccount> {
  let accessTokenReference = account.accessTokenReference;
  let refreshTokenReference = account.refreshTokenReference;

  if (account.accessToken) {
    accessTokenReference = accessTokenReference || createSecretReference('secret_ref_anti_access');
    await writeSecret(accessTokenReference, account.accessToken);
  }
  if (account.refreshToken) {
    refreshTokenReference = refreshTokenReference || createSecretReference('secret_ref_anti_refresh');
    await writeSecret(refreshTokenReference, account.refreshToken);
  }

  return {
    ...account,
    accessToken: '',
    refreshToken: '',
    accessTokenReference,
    refreshTokenReference,
  };
}

async function sanitizeAntiProviderAccounts(accounts: AntiProviderAccount[]): Promise<AntiProviderAccount[]> {
  const sanitizedAccounts: AntiProviderAccount[] = [];
  for (const account of accounts) {
    sanitizedAccounts.push(await sanitizeAntiProviderAccount(account));
  }
  return sanitizedAccounts;
}

function parseAntiProviderState(value: unknown): AntiProviderState {
  if (Array.isArray(value)) {
    return {
      accounts: value.map(parseAntiProviderAccount).filter((item): item is AntiProviderAccount => Boolean(item)),
    };
  }
  if (!isRecord(value) || !Array.isArray(value.accounts)) {
    return { accounts: [] };
  }
  const accounts = value.accounts.map(parseAntiProviderAccount).filter((item): item is AntiProviderAccount => Boolean(item));
  const selectedProviderId = typeof value.selectedProviderId === 'string' ? value.selectedProviderId : undefined;
  const sourceFilePath = typeof value.sourceFilePath === 'string' ? value.sourceFilePath : undefined;
  return {
    accounts,
    selectedProviderId: accounts.some((account) => account.id === selectedProviderId) ? selectedProviderId : undefined,
    sourceFilePath,
  };
}

async function readImportedAntiProviderState(): Promise<AntiProviderState> {
  const parsed = JSON.parse(await fs.readFile(await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE), 'utf8')) as unknown;
  return parseAntiProviderState(parsed);
}

async function readRawCodexAccountFromJsonFile(filePath: string, accountId: string): Promise<AntiProviderAccount | undefined> {
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.providerConnections)) return undefined;

  return parsed.providerConnections
    .filter(isRecord)
    .filter((item) => item.provider === 'codex')
    .map((item, index): AntiProviderAccount | null => {
      const id = (typeof item.id === 'string' && item.id) || '';
      if (id !== accountId) return null;
      const accessToken = typeof item.accessToken === 'string' ? item.accessToken : '';
      const refreshToken = typeof item.refreshToken === 'string' ? item.refreshToken : '';
      if (!accessToken || !refreshToken) return null;
      const providerSpecificData = isRecord(item.providerSpecificData) ? item.providerSpecificData : {};
      const chatgptAccountId =
        (typeof item.account_id === 'string' && item.account_id) ||
        (typeof item.accountId === 'string' && item.accountId) ||
        (typeof item.chatgptAccountId === 'string' && item.chatgptAccountId) ||
        (typeof providerSpecificData.chatgptAccountId === 'string' && providerSpecificData.chatgptAccountId) ||
        (typeof providerSpecificData.accountId === 'string' && providerSpecificData.accountId) ||
        undefined;
      const account =
        (typeof item.email === 'string' && item.email) ||
        (typeof item.name === 'string' && item.name) ||
        `Account ${index + 1}`;
      return { id, account, accessToken, refreshToken, chatgptAccountId };
    })
    .find((item): item is AntiProviderAccount => Boolean(item));
}

export async function readAntiProvidersFromJsonFile(filePath: string): Promise<AntiProviderAccount[]> {
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.providerConnections)) {
    throw new Error('File JSON không có danh sách provide hợp lệ.');
  }

  await importNineRouterModelsIntoDoniSettings(parsed);

  const parsedAccounts = parsed.providerConnections
    .filter(isRecord)
    .filter((item) => item.provider === 'codex')
    .map((item, index): AntiProviderAccount | null => {
      const accessToken = typeof item.accessToken === 'string' ? item.accessToken : '';
      const refreshToken = typeof item.refreshToken === 'string' ? item.refreshToken : '';
      if (!accessToken || !refreshToken) return null;
      
      const providerSpecificData = isRecord(item.providerSpecificData) ? item.providerSpecificData : {};
      const chatgptAccountId =
        (typeof item.account_id === 'string' && item.account_id) ||
        (typeof item.accountId === 'string' && item.accountId) ||
        (typeof item.chatgptAccountId === 'string' && item.chatgptAccountId) ||
        (typeof providerSpecificData.chatgptAccountId === 'string' && providerSpecificData.chatgptAccountId) ||
        (typeof providerSpecificData.accountId === 'string' && providerSpecificData.accountId) ||
        undefined;
      const account =
        (typeof item.email === 'string' && item.email) ||
        (typeof item.name === 'string' && item.name) ||
        `Account ${index + 1}`;
      const id = (typeof item.id === 'string' && item.id) || `${account}-${index}`;
      return { id, account, accessToken, refreshToken, chatgptAccountId };
    })
    .filter((item): item is AntiProviderAccount => Boolean(item));
  const accounts = await sanitizeAntiProviderAccounts(parsedAccounts);
  const current = await listImportedAntiProviders();
  await saveImportedAntiProviders({
    accounts,
    selectedProviderId: accounts.some((account) => account.id === current.selectedProviderId) ? current.selectedProviderId : undefined,
    sourceFilePath: filePath,
  });
  return accounts;
}

export async function listImportedAntiProviders(): Promise<AntiProviderState> {
  try {
    const state = await readImportedAntiProviderState();
    const sanitizedAccounts = await sanitizeAntiProviderAccounts(state.accounts);
    if (JSON.stringify(sanitizedAccounts) !== JSON.stringify(state.accounts)) {
      await saveImportedAntiProviders({ ...state, accounts: sanitizedAccounts });
    }
    return { ...state, accounts: sanitizedAccounts };
  } catch {
    return { accounts: [] };
  }
}

async function saveImportedAntiProviders(state: AntiProviderState): Promise<void> {
  const previousState = state.sourceFilePath ? undefined : await readImportedAntiProviderState().catch(() => undefined);
  const sanitizedAccounts = await sanitizeAntiProviderAccounts(state.accounts);
  await fs.writeFile(
    await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE),
    JSON.stringify({ ...state, sourceFilePath: state.sourceFilePath ?? previousState?.sourceFilePath, accounts: sanitizedAccounts }, null, 2),
    'utf8',
  );
}

export async function applyAntiProvider(account: AntiProviderAccount): Promise<void> {
  const antiPath = await getCodexHomeFile('auth.json');
  const providerState: AntiProviderState = await readImportedAntiProviderState().catch(() => ({ accounts: [] }));
  const storedAccount = providerState.accounts.find((item) => item.id === account.id);
  const accountToApply = storedAccount ?? account;
  let current: AntiConfig = {};
  try {
    const parsed = JSON.parse(await fs.readFile(antiPath, 'utf8')) as unknown;
    if (isRecord(parsed)) current = parsed as AntiConfig;
  } catch {
    current = {};
  }

  const rawAccount = providerState.sourceFilePath
    ? await readRawCodexAccountFromJsonFile(providerState.sourceFilePath, accountToApply.id).catch((error) => {
      logAntiProviderError('Could not hydrate tokens from source backup file.', {
        accountId: accountToApply.id,
        account: accountToApply.account,
        sourceFilePath: providerState.sourceFilePath,
        error: errorDetails(error),
      });
      return undefined;
    })
    : undefined;
  let accessToken = account.accessToken || accountToApply.accessToken || rawAccount?.accessToken || '';
  let refreshToken = account.refreshToken || accountToApply.refreshToken || rawAccount?.refreshToken || '';
  if (!accessToken && accountToApply.accessTokenReference) {
    try {
      accessToken = await readSecret(accountToApply.accessTokenReference);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      logAntiProviderError('Could not read access token reference.', {
        accountId: accountToApply.id,
        account: accountToApply.account,
        accessTokenReference: accountToApply.accessTokenReference,
        sourceFilePath: providerState.sourceFilePath,
        error: errorDetails(error),
      });
      if (!/Secret reference was not found/i.test(message)) throw error;
    }
  }
  if (!refreshToken && accountToApply.refreshTokenReference) {
    try {
      refreshToken = await readSecret(accountToApply.refreshTokenReference);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      logAntiProviderError('Could not read refresh token reference.', {
        accountId: accountToApply.id,
        account: accountToApply.account,
        refreshTokenReference: accountToApply.refreshTokenReference,
        sourceFilePath: providerState.sourceFilePath,
        error: errorDetails(error),
      });
      if (!/Secret reference was not found/i.test(message)) throw error;
    }
  }
  if (!accessToken || !refreshToken) {
    logAntiProviderError('Apply failed because token material is missing.', {
      accountId: accountToApply.id,
      account: accountToApply.account,
      sourceFilePath: providerState.sourceFilePath,
      hasRawAccessTokenFromRequest: Boolean(account.accessToken),
      hasRawRefreshTokenFromRequest: Boolean(account.refreshToken),
      hasRawAccessTokenFromState: Boolean(accountToApply.accessToken),
      hasRawRefreshTokenFromState: Boolean(accountToApply.refreshToken),
      hasRawAccessTokenFromSourceBackup: Boolean(rawAccount?.accessToken),
      hasRawRefreshTokenFromSourceBackup: Boolean(rawAccount?.refreshToken),
      hasAccessTokenAfterHydration: Boolean(accessToken),
      hasRefreshTokenAfterHydration: Boolean(refreshToken),
      accessTokenReference: accountToApply.accessTokenReference,
      refreshTokenReference: accountToApply.refreshTokenReference,
    });
    throw new Error(`Secret Store không còn token cho ${accountToApply.account}. Hãy import lại JSON provider để tạo token reference mới.`);
  }

  const next: AntiConfig = {
    ...current,
    tokens: {
      ...(isRecord(current.tokens) ? current.tokens : {}),
      access_token: accessToken,
      refresh_token: refreshToken,
      account_id: accountToApply.chatgptAccountId ?? current.tokens?.account_id,
    },
  };

  await fs.writeFile(antiPath, JSON.stringify(next, null, 2), 'utf8');
  const sanitizedAccount = await sanitizeAntiProviderAccount({
    ...accountToApply,
    accessToken,
    refreshToken,
  });
  await saveImportedAntiProviders({
    ...providerState,
    accounts: providerState.accounts.map((item) => (item.id === sanitizedAccount.id ? sanitizedAccount : item)),
    selectedProviderId: accountToApply.id,
  });
}
