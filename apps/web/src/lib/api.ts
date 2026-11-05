import type { ApiError } from '@smartshelf/contracts';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function createApiClient(
  accessToken?: string,
  onUnauthorized?: () => void,
) {
  const base = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(
    /\/$/,
    '',
  );
  return async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${base}${path}`, { ...init, headers });
    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => null)) as ApiError | null;
      const message = Array.isArray(error?.message)
        ? error.message.join(' ')
        : error?.message;
      if (response.status === 401 && accessToken) onUnauthorized?.();
      throw new ApiRequestError(
        response.status,
        response.status === 401 && accessToken
          ? 'Your session has expired. Please sign in again.'
          : message ||
              `Unable to complete the request (${response.status}). Please try again.`,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  };
}
