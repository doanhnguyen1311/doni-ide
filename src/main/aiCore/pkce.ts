import crypto from 'node:crypto';

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createPkceVerifier(): string {
  return base64Url(crypto.randomBytes(64));
}

export function createPkceChallenge(verifier: string): string {
  return base64Url(crypto.createHash('sha256').update(verifier).digest());
}

export function createOAuthState(): string {
  return base64Url(crypto.randomBytes(32));
}
