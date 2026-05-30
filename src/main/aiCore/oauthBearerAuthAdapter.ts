import type { ProviderAuthAdapter } from './providerAuthAdapters';
import { readSecret } from './secretStore';

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

function clineAccessToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('workos:') ? trimmed : `workos:${trimmed}`;
}

export const oauthBearerAuthAdapter: ProviderAuthAdapter = {
  method: 'oauthPkce',
  async resolve({ account }) {
    const accessTokenReference =
      account.providerId === 'github-copilot' && account.credentialReferences?.copilotToken
        ? account.credentialReferences.copilotToken
        : account.credentialReferences?.accessToken;
    let accessToken = '';
    if (accessTokenReference) {
      try {
        accessToken = await readSecret(accessTokenReference);
      } catch (error) {
        console.error('[ai-auth] failed to read oauth access token secret', JSON.stringify({
          providerId: account.providerId,
          accountId: account.id,
          displayName: account.displayName,
          authMethod: account.authMethod,
          accessTokenReference,
          error: errorDetails(error),
        }, null, 2));
        throw error;
      }
    }
    if (!accessToken) {
      throw new Error(`AI account ${account.displayName} does not have an OAuth access token reference.`);
    }

    const bearerToken = account.providerId === 'cline' ? clineAccessToken(accessToken) : accessToken;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearerToken}`,
    };
    if (account.providerId === 'cline') {
      headers['HTTP-Referer'] = 'https://cline.bot';
      headers['X-Title'] = 'Cline';
      headers['X-CLIENT-TYPE'] = 'doni-ide';
      headers['X-PLATFORM'] = process.platform;
      headers['X-PLATFORM-VERSION'] = process.version;
    }
    const kiloOrgId = account.providerId === 'kilo-code' ? account.metadata?.orgId : undefined;
    if (typeof kiloOrgId === 'string' && kiloOrgId.trim()) {
      headers['X-Kilocode-OrganizationID'] = kiloOrgId.trim();
    }

    return {
      method: 'oauthPkce',
      headers,
    };
  },
};
