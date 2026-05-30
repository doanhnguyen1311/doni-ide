import type { OAuthPkceAuthAdapter } from './oauthPkceAuthAdapter';
import { clineOAuthAdapter } from './clineOAuthAdapter';
import { geminiOAuthPkceAdapter } from './geminiOAuthPkceAdapter';

const oauthAdapters = new Map<string, OAuthPkceAuthAdapter>([
  [geminiOAuthPkceAdapter.providerId, geminiOAuthPkceAdapter],
  [clineOAuthAdapter.providerId, clineOAuthAdapter],
]);

export function getOAuthPkceAdapter(providerId: string): OAuthPkceAuthAdapter | undefined {
  return oauthAdapters.get(providerId);
}
