/**
 * Centralized API Client adhering to Single Responsibility Principle (SRP)
 * and Dependency Inversion Principle (DIP).
 *
 * Encapsulates base URL configuration, request serialization, error transformation,
 * HTTP headers, and enterprise-grade resilient retry mechanism with exponential
 * backoff and jitter for transient connection errors and retryable HTTP status codes.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Initial delay before first retry in milliseconds (default: 500ms) */
  baseDelayMs?: number;
  /** Maximum delay between retries in milliseconds (default: 5000ms) */
  maxDelayMs?: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  /** Random jitter range in milliseconds (default: 150ms) */
  jitterMs?: number;
  /** Per-attempt request timeout in milliseconds (default: 15000ms) */
  timeoutMs?: number;
  /** HTTP methods eligible for automatic retry on 5xx errors (default: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']) */
  retryableMethods?: string[];
  /** HTTP status codes that trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Custom predicate to determine whether an error or response should trigger a retry */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface RequestOptions extends RequestInit {
  /**
   * Retry configuration for transient errors.
   * Pass `true` for default retry behavior (3 retries, exponential backoff).
   * Pass `false` to disable retries.
   * Or pass custom `RetryConfig`.
   */
  retry?: boolean | RetryConfig;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    message?: string,
    public readonly isConnectionError: boolean = false
  ) {
    super(message || `API error ${status}: ${body || statusText}`);
    this.name = 'ApiError';
  }
}

const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'shouldRetry'>> = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  backoffFactor: 2,
  jitterMs: 150,
  timeoutMs: 15000,
  retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true; // standard fetch throws TypeError on network/connection failures
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('connection') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      (error.name === 'TimeoutError' || msg.includes('timeout'))
    );
  }
  return false;
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('Retry-After');
  if (!header) return null;
  const seconds = Number(header);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(header);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

function calculateDelay(attempt: number, config: Required<Omit<RetryConfig, 'shouldRetry'>>, retryAfterMs: number | null): number {
  if (retryAfterMs !== null && retryAfterMs > 0) {
    return Math.min(retryAfterMs, config.maxDelayMs);
  }
  const exponential = config.baseDelayMs * Math.pow(config.backoffFactor, attempt);
  const jitter = Math.random() * config.jitterMs;
  return Math.min(exponential + jitter, config.maxDelayMs);
}

async function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError');
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(new DOMException('The operation was aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

async function request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const method = (options?.method ?? 'GET').toUpperCase();

  const retryEnabled = options?.retry !== false;
  const customConfig = typeof options?.retry === 'object' ? options.retry : {};
  const config = {
    ...DEFAULT_RETRY_CONFIG,
    ...customConfig,
    shouldRetry: customConfig.shouldRetry,
  };

  const isIdempotent = config.retryableMethods.includes(method);
  const maxRetries = retryEnabled ? config.retries : 0;

  let attempt = 0;
  while (true) {
    const headers = new Headers(options?.headers);

    if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('X-Role') && typeof window !== 'undefined') {
      const role = localStorage.getItem('cinemind_role');
      if (role) {
        headers.set('X-Role', role);
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let attemptSignal = options?.signal;

    if (config.timeoutMs > 0) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort(new DOMException(`Request timed out after ${config.timeoutMs}ms`, 'TimeoutError'));
      }, config.timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          controller.abort(options.signal?.reason);
        }, { once: true });
      }
      attemptSignal = controller.signal;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: attemptSignal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const status = response.status;
        const retryAfterMs = parseRetryAfter(response);

        const isExplicitRetry = config.shouldRetry
          ? config.shouldRetry(new ApiError(status, response.statusText, errorBody), attempt)
          : false;

        const isStatusRetryable =
          config.retryableStatusCodes.includes(status) &&
          (isIdempotent || status === 429 || status === 503 || options?.retry === true || typeof options?.retry === 'object');

        if (attempt < maxRetries && (isExplicitRetry || isStatusRetryable)) {
          const delay = calculateDelay(attempt, config, retryAfterMs);
          console.warn(`⚠️ [apiClient] HTTP ${status} on ${method} ${endpoint}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await sleep(delay, options?.signal);
          attempt++;
          continue;
        }

        throw new ApiError(status, response.statusText, errorBody);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);

      // Caller explicitly aborted request -> bubble up without retry
      if (options?.signal?.aborted) {
        throw err;
      }

      const isNetwork = isNetworkError(err);
      const isCustomRetry = config.shouldRetry ? config.shouldRetry(err, attempt) : false;
      const canRetryNetwork = isNetwork && (isIdempotent || options?.retry === true || typeof options?.retry === 'object' || attempt === 0);

      if (attempt < maxRetries && (isCustomRetry || canRetryNetwork)) {
        const delay = calculateDelay(attempt, config, null);
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`🔌 [apiClient] Connection failure on ${method} ${endpoint}: ${errMsg}. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await sleep(delay, options?.signal);
        attempt++;
        continue;
      }

      if (err instanceof ApiError) {
        throw err;
      }

      const errMsg = err instanceof Error ? err.message : 'Unknown connection error';
      throw new ApiError(0, 'CONNECTION_ERROR', errMsg, `Network connection failed on ${method} ${endpoint}: ${errMsg}`, true);
    }
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
