import type {
  ApiError,
  InventoryFilters,
  InventoryResponse,
} from '@smartshelf/contracts';

export interface InventoryService {
  list: (
    filters: InventoryFilters,
    signal?: AbortSignal,
  ) => Promise<InventoryResponse>;
}

export function createInventoryService(
  accessToken: string,
  onUnauthorized: () => void,
): InventoryService {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
  return {
    async list(filters, signal) {
      const query = new URLSearchParams();
      if (filters.q?.trim()) query.set('q', filters.q.trim());
      if (filters.status) query.set('status', filters.status);
      const response = await fetch(`${base}/pharmacist/medicines?${query}`, {
        signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
          throw new Error('Your session has expired. Please sign in again.');
        }
        const error = (await response
          .json()
          .catch(() => null)) as ApiError | null;
        const message = Array.isArray(error?.message)
          ? error.message.join(' ')
          : error?.message;
        throw new Error(
          response.status === 404
            ? 'The inventory API is not available yet. Please try again later.'
            : message || 'Unable to load inventory. Please try again.',
        );
      }
      return response.json() as Promise<InventoryResponse>;
    },
  };
}
