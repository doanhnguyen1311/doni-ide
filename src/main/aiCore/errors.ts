export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export function isRetryableProviderError(error: unknown): boolean {
  if (!(error instanceof AiProviderError)) return false;
  if (error.retryable) return true;
  return error.status === 408 || error.status === 409 || error.status === 425 || error.status === 429 || (typeof error.status === 'number' && error.status >= 500);
}
