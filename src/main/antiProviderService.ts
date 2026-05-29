import fs from 'node:fs/promises';
import type { AntiProviderAccount, AntiProviderState } from '../shared/types';
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

function parseAntiProviderAccount(value: unknown): AntiProviderAccount | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.account !== 'string' ||
    typeof value.accessToken !== 'string' ||
    typeof value.refreshToken !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    account: value.account,
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    chatgptAccountId:
      (typeof value.chatgptAccountId === 'string' && value.chatgptAccountId) ||
      (typeof value.accountId === 'string' && value.accountId) ||
      undefined,
  };
}

export async function readAntiProvidersFromJsonFile(filePath: string): Promise<AntiProviderAccount[]> {
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.providerConnections)) {
    throw new Error('File JSON không có danh sách provide hợp lệ.');
  }

  const accounts = parsed.providerConnections
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
  const current = await listImportedAntiProviders();
  await saveImportedAntiProviders({
    accounts,
    selectedProviderId: accounts.some((account) => account.id === current.selectedProviderId) ? current.selectedProviderId : undefined,
  });
  return accounts;
}

export async function listImportedAntiProviders(): Promise<AntiProviderState> {
  try {
    const parsed = JSON.parse(await fs.readFile(await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE), 'utf8')) as unknown;
    if (Array.isArray(parsed)) {
      return {
        accounts: parsed.map(parseAntiProviderAccount).filter((item): item is AntiProviderAccount => Boolean(item)),
      };
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.accounts)) return { accounts: [] };
    const accounts = parsed.accounts.map(parseAntiProviderAccount).filter((item): item is AntiProviderAccount => Boolean(item));
    const selectedProviderId = typeof parsed.selectedProviderId === 'string' ? parsed.selectedProviderId : undefined;
    return {
      accounts,
      selectedProviderId: accounts.some((account) => account.id === selectedProviderId) ? selectedProviderId : undefined,
    };
  } catch {
    return { accounts: [] };
  }
}

async function saveImportedAntiProviders(state: AntiProviderState): Promise<void> {
  await fs.writeFile(await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE), JSON.stringify(state, null, 2), 'utf8');
}

export async function applyAntiProvider(account: AntiProviderAccount): Promise<void> {
  const antiPath = await getCodexHomeFile('auth.json');
  let current: AntiConfig = {};
  try {
    const parsed = JSON.parse(await fs.readFile(antiPath, 'utf8')) as unknown;
    if (isRecord(parsed)) current = parsed as AntiConfig;
  } catch {
    current = {};
  }

  const next: AntiConfig = {
    ...current,
    tokens: {
      ...(isRecord(current.tokens) ? current.tokens : {}),
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      account_id: account.chatgptAccountId ?? current.tokens?.account_id,
    },
  };

  await fs.writeFile(antiPath, JSON.stringify(next, null, 2), 'utf8');
  const providerState = await listImportedAntiProviders();
  await saveImportedAntiProviders({
    accounts: providerState.accounts,
    selectedProviderId: account.id,
  });
}
