import { useLanguage } from '../preferences/LanguageProvider';
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
  const emails = new Set<string>();

  function findPharmacy(id: string) {
    const pharmacy = pharmacies.find((item) => item.id === id);
    if (!pharmacy) throw new Error('Preview pharmacy not found.');
    return pharmacy;
  }
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
    async createPharmacist(input) {
      findPharmacy(input.pharmacyId);
      if (emails.has(input.email))
        throw new Error(
          'An account with this email already exists in this preview.',
        );
      emails.add(input.email);
      // Never store the password, even in this temporary preview.
      return {
        id: crypto.randomUUID(),
        email: input.email,
        role: 'PHARMACIST',
        pharmacyId: input.pharmacyId,
      };
    },
    async saveSubscription(pharmacyId, input, exists) {
      const pharmacy = findPharmacy(pharmacyId);
      if (Boolean(pharmacy.subscription) !== exists)
        throw new Error('The subscription has changed. Reload its details.');
      const subscription = {
        ...input,
        id: pharmacy.subscription?.id ?? crypto.randomUUID(),
      };
      // Only the preview simulates status against a fixed demonstration date.
      // The real owner page always reads the status calculated by the backend.
      pharmacies = pharmacies.map((item) =>
        item.id === pharmacyId
          ? {
              ...item,
              subscription,
              subscriptionStatus: input.suspended
                ? 'SUSPENDED'
                : input.endDate < '2026-11-03'
                  ? 'EXPIRED'
                  : input.startDate > '2026-11-03'
                    ? 'NONE'
                    : 'ACTIVE',
            }
          : item,
      );
      return subscription;
    },
    async deleteSubscription(pharmacyId) {
      findPharmacy(pharmacyId);
      pharmacies = pharmacies.map((item) =>
        item.id === pharmacyId
          ? {
              ...item,
              subscription: null,
              subscriptionStatus: 'NONE',
            }
          : item,
      );
    },
  };
}

export function OwnerPreviewPage() {
  const { t, translateMessage } = useLanguage();
  const service = useMemo(createPreviewService, []);
  return (
    <>
      <aside className="owner-preview-notice">
        <strong>{t('Local development preview')}</strong>
        <p>
          {t(
            'Synthetic sample data only. Changes reset when this page is reopened or refreshed. No account is signed in and no database requests are made. Subscription status changes use a fixed sample date of 3 November 2026.',
          )}
        </p>
      </aside>
      <OwnerPharmaciesView service={service} />
    </>
  );
}
