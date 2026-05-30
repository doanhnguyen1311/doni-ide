import fs from 'node:fs/promises';
import type { ProviderAuthAdapter } from './providerAuthAdapters';
import { readSecret, writeSecret } from './secretStore';
import { getDoniHomeFile } from '../doniHome';

const IMPORTED_PROVIDERS_FILE = 'anti-providers.json';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLocalNineRouterEndpoint(apiBase: string | undefined): boolean {
  const normalized = apiBase?.trim().toLowerCase() ?? '';
  return normalized.includes('localhost:20128') || normalized.includes('127.0.0.1:20128');
}

async function readImportedGatewayApiKey(): Promise<string> {
  try {
    const imported = JSON.parse(await fs.readFile(await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE), 'utf8')) as unknown;
    if (!isRecord(imported) || typeof imported.sourceFilePath !== 'string') return '';
    const backup = JSON.parse(await fs.readFile(imported.sourceFilePath, 'utf8')) as unknown;
    if (!isRecord(backup) || !Array.isArray(backup.apiKeys)) return '';
    const apiKeyRecord =
      backup.apiKeys.filter(isRecord).find((item) => item.isActive === true && typeof item.key === 'string') ??
      backup.apiKeys.filter(isRecord).find((item) => typeof item.key === 'string');
    return typeof apiKeyRecord?.key === 'string' ? apiKeyRecord.key.trim() : '';
  } catch {
    return '';
  }
}

export const apiKeyAuthAdapter: ProviderAuthAdapter = {
  method: 'apiKey',
  async resolve({ settings, account }) {
    const secretReference = account.credentialReferences?.apiKey ?? account.secretReference;
    let apiKey = settings.apiKey.trim();
    if (!apiKey && secretReference) {
      try {
        apiKey = await readSecret(secretReference);
      } catch (error) {
        console.error('[ai-auth] failed to read api key secret', JSON.stringify({
          providerId: account.providerId,
          accountId: account.id,
          displayName: account.displayName,
          authMethod: account.authMethod,
          secretReference,
          error: errorDetails(error),
        }, null, 2));
        throw error;
      }
    }
    if (!apiKey && secretReference && isLocalNineRouterEndpoint(account.apiBase ?? settings.apiBase)) {
      const importedGatewayApiKey = await readImportedGatewayApiKey();
      if (importedGatewayApiKey) {
        apiKey = importedGatewayApiKey;
        await writeSecret(secretReference, importedGatewayApiKey);
      }
    }
    if (!apiKey) {
      throw new Error(`AI account ${account.displayName} does not have a secret reference.`);
    }

    if (account.providerId === 'gemini') {
      const headers: Record<string, string> = {
        'x-goog-api-key': apiKey,
      };
      return {
        method: 'apiKey',
        headers,
      };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    return {
      method: 'apiKey',
      headers,
    };
  },
};
