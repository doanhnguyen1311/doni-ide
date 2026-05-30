import type {
  AiProviderAccount,
  AiSettings,
  ProviderAccountConnectionState,
  ProviderConnectionSummary as ProviderConnectionSummaryType,
  ProviderDefinition,
} from '../../shared/types';
import { listConfiguredAccounts } from './accountManager';

function lastIso(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function parseErrorCode(message?: string): string | undefined {
  return message?.match(/\b([1-5]\d{2})\b/)?.[1];
}

function hasCredential(account: AiProviderAccount, provider?: ProviderDefinition): boolean {
  if (provider?.authType === 'none' || account.authMethod === 'localNoAuth') return true;
  if (account.authState?.configured) return true;
  return Boolean(
    account.credentialReferences?.apiKey ||
      account.credentialReferences?.accessToken ||
      account.credentialReferences?.refreshToken ||
      account.secretReference,
  );
}

function accountState(account: AiProviderAccount, provider?: ProviderDefinition): ProviderAccountConnectionState {
  if (account.status === 'disabled') return 'disconnected';
  if (account.status === 'invalid' || account.status === 'cooldown' || account.lastError) return 'error';
  return hasCredential(account, provider) ? 'connected' : 'disconnected';
}

function label(summary: Pick<ProviderConnectionSummaryType, 'totalAccounts' | 'connectedAccounts' | 'errorAccounts' | 'disconnectedAccounts' | 'lastErrorCode'>): string {
  if (summary.totalAccounts === 0) return 'No Connections';

  const parts: string[] = [];
  if (summary.connectedAccounts > 0) {
    parts.push(`${summary.connectedAccounts} Connected`);
  }
  if (summary.errorAccounts > 0) {
    const suffix = summary.lastErrorCode ? ` (${summary.lastErrorCode})` : '';
    parts.push(`${summary.errorAccounts} Error${suffix}`);
  }
  if (summary.disconnectedAccounts > 0) {
    parts.push(`${summary.disconnectedAccounts} Disconnected`);
  }
  return parts.join(' + ');
}

export class ProviderConnectionSummary {
  summarize(settings: AiSettings, provider: ProviderDefinition): ProviderConnectionSummaryType {
    const accounts = listConfiguredAccounts(settings).filter((account) => account.providerId === provider.id);
    let connectedAccounts = 0;
    let errorAccounts = 0;
    let disconnectedAccounts = 0;
    let lastErrorCode: string | undefined;
    let lastErrorTime: string | undefined;

    const accountSummaries = accounts.map((account) => {
      const status = accountState(account, provider);
      if (status === 'connected') connectedAccounts += 1;
      if (status === 'error') errorAccounts += 1;
      if (status === 'disconnected') disconnectedAccounts += 1;

      const errorCode = account.lastErrorCode ?? parseErrorCode(account.lastError);
      const errorTime = account.lastErrorTime ?? account.cooldownUntil;
      if (status === 'error') {
        lastErrorCode = errorCode ?? lastErrorCode;
        lastErrorTime = lastIso(lastErrorTime, errorTime);
      }

      return {
        accountId: account.id,
        providerId: account.providerId,
        displayName: account.displayName,
        status,
        ...(account.apiBase ? { apiBase: account.apiBase } : {}),
        ...(errorCode ? { errorCode } : {}),
        ...(account.lastError ? { errorMessage: account.lastError } : {}),
        ...(errorTime ? { errorTime } : {}),
      };
    });

    const base = {
      providerId: provider.id,
      totalAccounts: accounts.length,
      connectedAccounts,
      errorAccounts,
      disconnectedAccounts,
      ...(lastErrorCode ? { lastErrorCode } : {}),
      ...(lastErrorTime ? { lastErrorTime } : {}),
      accounts: accountSummaries,
    };

    return {
      ...base,
      label: label(base),
      readinessLabel:
        accounts.length === 0
          ? 'No Connections'
          : errorAccounts > 0 && connectedAccounts > 0
            ? 'Degraded'
            : errorAccounts > 0
              ? 'Error'
              : connectedAccounts > 0
                ? 'Ready'
                : 'No Connections',
    };
  }

  summarizeAll(settings: AiSettings, providers: ProviderDefinition[]): ProviderConnectionSummaryType[] {
    return providers.map((provider) => this.summarize(settings, provider));
  }
}

export const providerConnectionSummary = new ProviderConnectionSummary();

