export function getGeminiOAuthClientId(customClientId?: string): string {
  return customClientId?.trim() || process.env.GEMINI_OAUTH_CLIENT_ID?.trim() || '';
}

export function getGeminiOAuthClientSecret(customClientSecret?: string): string {
  return customClientSecret?.trim() || process.env.GEMINI_OAUTH_CLIENT_SECRET?.trim() || '';
}