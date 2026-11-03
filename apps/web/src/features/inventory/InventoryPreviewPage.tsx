import { useMemo, useState } from 'react';
import type {
  InventoryMedicine,
  SubscriptionStatus,
} from '@smartshelf/contracts';
import { InventoryView } from './InventoryPage';
import type { InventoryService } from './inventory-api';

// Fixed examples for 3 November 2026; real calculations belong to the backend.
const medicines: InventoryMedicine[] = [
  {
    id: 'preview-healthy',
    displayName: 'Paracetamol 500 mg',
    scientificName: 'Acetaminophen',
    category: 'Pain relief',
    reorderThreshold: 10,
    availableQuantity: 80,
    indicators: ['HEALTHY'],
    batches: [
      {
        id: 'batch-healthy',
        batchNumber: 'PCM-001',
        quantity: 80,
        expiryDate: '2027-12-31',
        storageLocation: 'Shelf A1',
        unitCost: '2.50',
        barcode: '000123456789',
        indicators: [],
      },
    ],
  },
  {
    id: 'preview-low-soon',
    displayName: 'Amoxicillin 250 mg',
    scientificName: 'Amoxicillin',
    category: 'Antibiotic',
    reorderThreshold: 10,
    availableQuantity: 5,
    indicators: ['LOW_STOCK', 'EXPIRING_SOON'],
    batches: [
      {
        id: 'batch-soon',
        batchNumber: 'AMX-001',
        quantity: 5,
        expiryDate: '2026-11-15',
        storageLocation: 'Shelf B2',
        unitCost: '3.75',
        barcode: null,
        indicators: ['EXPIRING_SOON'],
      },
    ],
  },
  {
    id: 'preview-expired',
    displayName: 'Cetirizine 10 mg',
    scientificName: 'Cetirizine hydrochloride',
    category: 'Allergy',
    reorderThreshold: 5,
    availableQuantity: 0,
    indicators: ['LOW_STOCK', 'EXPIRED'],
    batches: [
      {
        id: 'batch-expired',
        batchNumber: 'CTZ-001',
        quantity: 12,
        expiryDate: '2026-10-31',
        storageLocation: 'Shelf C3',
        unitCost: '1.20',
        barcode: '00990011',
        indicators: ['EXPIRED'],
      },
    ],
  },
  {
    id: 'preview-empty',
    displayName: 'Salbutamol inhaler',
    scientificName: 'Salbutamol',
    category: 'Respiratory',
    reorderThreshold: 3,
    availableQuantity: 0,
    indicators: ['LOW_STOCK'],
    batches: [],
  },
  {
    id: 'preview-multiple',
    displayName: 'Ibuprofen 200 mg',
    scientificName: 'Ibuprofen',
    category: 'Pain relief',
    reorderThreshold: 10,
    availableQuantity: 30,
    indicators: ['EXPIRING_SOON', 'EXPIRED'],
    batches: [
      {
        id: 'batch-ibu-1',
        batchNumber: 'IBU-001',
        quantity: 10,
        expiryDate: '2026-11-20',
        storageLocation: 'Shelf D4',
        unitCost: '2.00',
        barcode: null,
        indicators: ['EXPIRING_SOON'],
      },
      {
        id: 'batch-ibu-2',
        batchNumber: 'IBU-002',
        quantity: 20,
        expiryDate: '2027-06-30',
        storageLocation: 'Shelf D4',
        unitCost: '2.10',
        barcode: null,
        indicators: [],
      },
      {
        id: 'batch-ibu-3',
        batchNumber: 'IBU-003',
        quantity: 4,
        expiryDate: '2026-10-01',
        storageLocation: 'Shelf D4',
        unitCost: '1.80',
        barcode: null,
        indicators: ['EXPIRED'],
      },
      {
        id: 'batch-ibu-4',
        batchNumber: 'IBU-004',
        quantity: 0,
        expiryDate: '2027-06-30',
        storageLocation: 'Shelf D4',
        unitCost: '2.10',
        barcode: null,
        indicators: [],
      },
    ],
  },
];

export function InventoryPreviewPage() {
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>('ACTIVE');
  const service = useMemo<InventoryService>(
    () => ({
      async list(filters) {
        const q = filters.q?.trim().toLowerCase();
        const items = medicines.filter(
          (medicine) =>
            (!q ||
              medicine.displayName.toLowerCase().includes(q) ||
              medicine.scientificName.toLowerCase().includes(q)) &&
            (!filters.status || medicine.indicators.includes(filters.status)),
        );
        return { items, total: items.length, subscriptionStatus };
      },
    }),
    [subscriptionStatus],
  );
  return (
    <>
      <aside className="inventory-preview-notice">
        <strong>Local development preview</strong>
        <p>
          Synthetic inventory with fixed indicators for 3 November 2026. No
          login or database requests. This selector changes only the sample
          subscription, and resets on refresh.
        </p>
        <label htmlFor="preview-inventory-subscription">
          Sample subscription
          <select
            id="preview-inventory-subscription"
            value={subscriptionStatus}
            onChange={(event) =>
              setSubscriptionStatus(event.target.value as SubscriptionStatus)
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="NONE">No active subscription</option>
          </select>
        </label>
      </aside>
      <InventoryView service={service} />
    </>
  );
}
