export const TIMEOUTS = {
  AUTH_INIT: 10000, // 10s for auth state check
  DATABASE_INIT: 15000, // 15s total database initialization
  DATABASE_OPEN: 8000, // 8s for SQLite.openDatabaseAsync
  DATABASE_SCHEMA: 5000, // 5s per table/index creation
  SPLASH_MAX: 30000, // 30s absolute maximum before force-loading
} as const;

export interface TimeoutError extends Error {
  isTimeout: boolean;
}

export class TimeoutError extends Error {
  isTimeout = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`${errorMessage} after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}