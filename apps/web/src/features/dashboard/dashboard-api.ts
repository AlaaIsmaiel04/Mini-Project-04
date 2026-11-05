import type { Dashboard } from '@smartshelf/contracts';
import { createApiClient } from '../../lib/api';
export function createDashboardService(
  token: string,
  unauthorized: () => void,
) {
  const request = createApiClient(token, unauthorized);
  return {
    get: (signal?: AbortSignal) =>
      request<Dashboard>('/pharmacist/dashboard', { signal }),
  };
}
