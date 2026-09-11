export class AIServiceError extends Error {
  constructor(public code: string, message: string, public statusCode = 0) {
    super(message);
    this.name = 'AIServiceError';
  }

  get isRetryable(): boolean {
    return ['NETWORK', 'TIMEOUT', 'LLM_FAILED', 'AI_SERVICE_UNAVAILABLE', 'RATE_LIMITED'].includes(this.code);
  }
}

export interface RequestOptions {
  authToken?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}
