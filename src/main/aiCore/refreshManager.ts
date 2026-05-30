import type { AiProviderAccount, RefreshProviderAccountResponse } from '../../shared/types';

const DEFAULT_REFRESH_BEFORE_MS = 5 * 60 * 1000;

export interface RefreshCheckResult {
  refreshable: boolean;
  shouldRefresh: boolean;
  reason: 'not_refreshable' | 'no_expiry' | 'not_due' | 'due';
  expiresAt?: string;
}

export function checkAccountRefreshState(account: AiProviderAccount, refreshBeforeMs = DEFAULT_REFRESH_BEFORE_MS): RefreshCheckResult {
  if (!account.authState?.refreshable || !account.credentialReferences?.refreshToken) {
    return {
      refreshable: false,
      shouldRefresh: false,
      reason: 'not_refreshable',
      expiresAt: account.authState?.expiresAt,
    };
  }

  if (!account.authState.expiresAt) {
    return {
      refreshable: true,
      shouldRefresh: false,
      reason: 'no_expiry',
    };
  }

  const expiresAtMs = Date.parse(account.authState.expiresAt);
  const shouldRefresh = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= refreshBeforeMs;
  return {
    refreshable: true,
    shouldRefresh,
    reason: shouldRefresh ? 'due' : 'not_due',
    expiresAt: account.authState.expiresAt,
  };
}

export async function refreshProviderAccountSkeleton(account: AiProviderAccount): Promise<RefreshProviderAccountResponse> {
  const state = checkAccountRefreshState(account);
  if (!state.refreshable) {
    return {
      ok: false,
      status: 'not_refreshable',
      accountId: account.id,
      providerId: account.providerId,
      expiresAt: state.expiresAt,
      message: 'This account is not refreshable.',
    };
  }

  if (!state.shouldRefresh) {
    return {
      ok: true,
      status: 'not_required',
      accountId: account.id,
      providerId: account.providerId,
      expiresAt: state.expiresAt,
      message: 'Refresh is not required yet.',
    };
  }

  return {
    ok: false,
    status: 'not_implemented',
    accountId: account.id,
    providerId: account.providerId,
    expiresAt: state.expiresAt,
    message: 'Provider refresh adapters are not implemented yet.',
  };
}
