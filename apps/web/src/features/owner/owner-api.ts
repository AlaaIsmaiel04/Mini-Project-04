import type {
  ApiError,
  CreatePharmacyInput,
  ListResponse,
  OwnerPharmacy,
  OwnerPharmacyFilters,
  CreatePharmacistInput,
  SessionUser,
  Subscription,
  SubscriptionInput,
} from '@smartshelf/contracts';

export interface OwnerPharmacyService {
  list: (
    filters: OwnerPharmacyFilters,
    signal?: AbortSignal,
  ) => Promise<ListResponse<OwnerPharmacy>>;
  create: (input: CreatePharmacyInput) => Promise<OwnerPharmacy>;
  createPharmacist: (input: CreatePharmacistInput) => Promise<SessionUser>;
  saveSubscription: (
    pharmacyId: string,
    input: SubscriptionInput,
    exists: boolean,
  ) => Promise<Subscription>;
  deleteSubscription: (pharmacyId: string) => Promise<void>;
}

export function createOwnerPharmacyService(
  accessToken: string,
  onUnauthorized: () => void,
): OwnerPharmacyService {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
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
          ? 'The owner pharmacy API is not available yet. Please try again later.'
          : message || 'Unable to complete the request. Please try again.',
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  return {
    list(filters, signal) {
      const query = new URLSearchParams();
      if (filters.q?.trim()) query.set('q', filters.q.trim());
      if (filters.status) query.set('status', filters.status);
      return request<ListResponse<OwnerPharmacy>>(
        `/owner/pharmacies?${query}`,
        { signal },
      );
    },
    create(input) {
      return request<OwnerPharmacy>('/owner/pharmacies', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    createPharmacist(input) {
      return request<SessionUser>('/owner/pharmacists', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    saveSubscription(pharmacyId, input, exists) {
      return request<Subscription>(
        `/owner/pharmacies/${encodeURIComponent(pharmacyId)}/subscription`,
        {
          method: exists ? 'PATCH' : 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    deleteSubscription(pharmacyId) {
      return request<void>(
        `/owner/pharmacies/${encodeURIComponent(pharmacyId)}/subscription`,
        {
          method: 'DELETE',
        },
      );
    },
  };
}
