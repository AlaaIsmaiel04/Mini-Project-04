import type {
  ListResponse,
  PublicPharmacy,
  PublicPharmacyFilters,
  MedicineSearchFilters,
} from '@smartshelf/contracts';
import { createApiClient } from '../../lib/api';

// Construct the public allowlist even if a future server accidentally returns more.
export function publicPharmacy(row: PublicPharmacy): PublicPharmacy {
  const period = (value: PublicPharmacy['currentDuty']) =>
    value ? { startsAt: value.startsAt, endsAt: value.endsAt } : null;
  return {
    name: row.name,
    area: row.area,
    address: row.address,
    phone: row.phone,
    onDutyNow: row.onDutyNow,
    currentDuty: period(row.currentDuty),
    nextDuty: period(row.nextDuty),
    inventoryUpdatedAt: row.inventoryUpdatedAt,
  };
}

export function createPublicService(request = createApiClient()) {
  async function list(
    path: string,
    filters: PublicPharmacyFilters & { q?: string },
    signal?: AbortSignal,
  ): Promise<ListResponse<PublicPharmacy>> {
    const params = new URLSearchParams();
    if (filters.q !== undefined) params.set('q', filters.q.trim());
    if (filters.area?.trim()) params.set('area', filters.area.trim());
    if (filters.onDutyNow !== undefined)
      params.set('onDutyNow', String(filters.onDutyNow));
    const result = await request<ListResponse<PublicPharmacy>>(
      `${path}?${params}`,
      { signal },
    );
    return { items: result.items.map(publicPharmacy), total: result.total };
  }
  return {
    searchMedicines(filters: MedicineSearchFilters, signal?: AbortSignal) {
      if (!filters.q.trim())
        return Promise.reject(new Error('Enter a medicine name.'));
      return list('/public/medicines', filters, signal);
    },
    listPublicPharmacies(filters: PublicPharmacyFilters, signal?: AbortSignal) {
      return list(
        '/public/pharmacies',
        { area: filters.area, onDutyNow: filters.onDutyNow },
        signal,
      );
    },
  };
}

export function jordanTime(value: string, language: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-GB', {
        timeZone: 'Asia/Amman',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}
