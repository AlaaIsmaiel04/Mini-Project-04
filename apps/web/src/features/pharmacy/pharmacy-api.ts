import type {
  ProfileResponse,
  UpdateProfileInput,
  DutyInput,
  DutyPeriod,
  ListResponse,
} from '@smartshelf/contracts';
import { createApiClient } from '../../lib/api';
export function createPharmacyService(token: string, unauthorized: () => void) {
  const request = createApiClient(token, unauthorized);
  return {
    profile: (signal?: AbortSignal) =>
      request<ProfileResponse>('/pharmacist/profile', { signal }),
    updateProfile: (input: UpdateProfileInput) =>
      request<ProfileResponse>('/pharmacist/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          area: input.area,
          address: input.address,
          phone: input.phone,
        }),
      }),
    duties: (signal?: AbortSignal) =>
      request<ListResponse<DutyPeriod>>('/pharmacist/duty-periods', { signal }),
    saveDuty: (input: DutyInput, id?: string) =>
      request<DutyPeriod>(
        '/pharmacist/duty-periods' + (id ? '/' + encodeURIComponent(id) : ''),
        {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify({
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          }),
        },
      ),
    deleteDuty: (id: string) =>
      request<void>('/pharmacist/duty-periods/' + encodeURIComponent(id), {
        method: 'DELETE',
      }),
  };
}
export type PharmacyService = ReturnType<typeof createPharmacyService>;
