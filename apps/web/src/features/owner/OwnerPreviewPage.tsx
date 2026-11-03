import { useMemo } from 'react';
import type { OwnerPharmacy, SubscriptionStatus } from '@smartshelf/contracts';
import { OwnerPharmaciesView } from './OwnerPharmaciesPage';
import type { OwnerPharmacyService } from './owner-api';

function createPreviewService(): OwnerPharmacyService {
  // Synthetic examples only. These statuses are fixed, not a subscription calculation.
  let pharmacies: OwnerPharmacy[] = (
    ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'NONE'] as SubscriptionStatus[]
  ).map((subscriptionStatus, index) => ({
    id: `preview-${index}`,
    name: [
      'Cedar Pharmacy',
      'Olive Pharmacy',
      'Palm Pharmacy',
      'Jasmine Pharmacy',
    ][index]!,
    area: index % 2 === 0 ? 'North' : 'Central',
    address: `Demo street ${index + 1}`,
    phone: `+9626000000${index + 1}`,
    inventoryUpdatedAt: null,
    subscription:
      subscriptionStatus === 'NONE'
        ? null
        : {
            id: `preview-subscription-${index}`,
            startDate: '2026-01-01',
            endDate:
              subscriptionStatus === 'EXPIRED' ? '2026-01-31' : '2026-12-31',
            suspended: subscriptionStatus === 'SUSPENDED',
          },
    subscriptionStatus,
  }));
  return {
    async list(filters) {
      const items = pharmacies.filter(
        (pharmacy) =>
          (!filters.q ||
            pharmacy.name.toLowerCase().includes(filters.q.toLowerCase())) &&
          (!filters.status || pharmacy.subscriptionStatus === filters.status),
      );
      return { items, total: items.length };
    },
    async create(input) {
      const pharmacy: OwnerPharmacy = {
        ...input,
        id: crypto.randomUUID(),
        inventoryUpdatedAt: null,
        subscription: null,
        subscriptionStatus: 'NONE',
      };
      pharmacies = [pharmacy, ...pharmacies];
      return pharmacy;
    },
  };
}

export function OwnerPreviewPage() {
  const service = useMemo(createPreviewService, []);
  return (
    <>
      <aside className="owner-preview-notice">
        <strong>Local development preview</strong>
        <p>
          Synthetic sample data only. Changes reset when this page is reopened
          or refreshed. No account is signed in and no database requests are
          made.
        </p>
      </aside>
      <OwnerPharmaciesView service={service} />
    </>
  );
}
