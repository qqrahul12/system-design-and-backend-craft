/**
 * Centralized API Client adhering to Single Responsibility Principle (SRP)
 * and Dependency Inversion Principle (DIP).
 *
 * Encapsulates base URL configuration, request serialization, error transformation,
 * and HTTP headers away from React UI components.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    message?: string
  ) {
    super(message || `API error ${status}: ${body || statusText}`);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('X-Role') && typeof window !== 'undefined') {
    const role = localStorage.getItem('cinemind_role');
    if (role) {
      headers.set('X-Role', role);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const apiClient = {
  get: <T>(endpoint: string, init?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...init, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T> =>
    request<T>(endpoint, {
      ...init,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T> =>
    request<T>(endpoint, {
      ...init,
      method: 'PUT',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, init?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...init, method: 'DELETE' }),
};
