import { useLanguage } from '../preferences/LanguageProvider';
import { useMemo, useRef, useState } from 'react';
import type {
  InventoryMedicine,
  SubscriptionStatus,
} from '@smartshelf/contracts';
import { InventoryView } from './InventoryPage';
import type { InventoryService } from './inventory-api';
import { ApiRequestError } from '../../lib/api';

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
  const { t, translateMessage } = useLanguage();
  const data = useRef(structuredClone(medicines));
  const currentStatus = useRef<SubscriptionStatus>('ACTIVE');
  const nextSave = useRef('normal');
  const failNextRead = useRef(false);
  const [saveScenario, setSaveScenario] = useState('normal');
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>('ACTIVE');
  const service = useMemo<InventoryService>(() => {
    async function beforeSave() {
      const scenario = nextSave.current;
      nextSave.current = 'normal';
      setSaveScenario('normal');
      if (scenario === 'slow')
        await new Promise((resolve) => setTimeout(resolve, 2000));
      if (scenario === 'validation')
        throw new ApiRequestError(
          400,
          'Sample validation rejection: review the supplied fields.',
        );
      if (scenario === 'forbidden')
        throw new ApiRequestError(
          403,
          'Sample permission rejection: changes are not allowed.',
        );
      if (scenario === 'not-found')
        throw new ApiRequestError(
          404,
          'Sample record no longer exists. Cancel and reload the inventory.',
        );
      if (scenario === 'network')
        throw new TypeError('Sample network failure. Please try again.');
      if (scenario === 'refresh-error') failNextRead.current = true;
    }
    function writable() {
      if (currentStatus.current !== 'ACTIVE')
        throw new ApiRequestError(
          403,
          `Subscription is ${currentStatus.current}. Changes are not allowed.`,
        );
    }
    function findMedicine(id: string) {
      const medicine = data.current.find((item) => item.id === id);
      if (!medicine) throw new ApiRequestError(404, 'Medicine not found.');
      return medicine;
    }
    function uniqueName(name: string, id?: string) {
      if (
        data.current.some(
          (item) =>
            item.id !== id &&
            item.displayName.trim().toLowerCase() === name.trim().toLowerCase(),
        )
      ) {
        throw new ApiRequestError(
          409,
          'A medicine with this display name already exists.',
        );
      }
    }
    // Development demonstration only, fixed business date; never used by real routes.
    function recalculate(medicine: InventoryMedicine) {
      const today = Date.parse('2026-11-03T00:00:00Z');
      medicine.batches.forEach((batch) => {
        const days =
          (Date.parse(`${batch.expiryDate}T00:00:00Z`) - today) / 86400000;
        batch.indicators =
          days < 0 ? ['EXPIRED'] : days <= 90 ? ['EXPIRING_SOON'] : [];
      });
      medicine.availableQuantity = medicine.batches
        .filter((batch) => !batch.indicators.includes('EXPIRED'))
        .reduce((sum, batch) => sum + batch.quantity, 0);
      medicine.indicators = [];
      if (medicine.availableQuantity <= medicine.reorderThreshold)
        medicine.indicators.push('LOW_STOCK');
      for (const flag of ['EXPIRED', 'EXPIRING_SOON'] as const) {
        if (
          medicine.batches.some(
            (batch) => batch.quantity > 0 && batch.indicators.includes(flag),
          )
        )
          medicine.indicators.push(flag);
      }
      if (!medicine.indicators.length) medicine.indicators.push('HEALTHY');
      return structuredClone(medicine);
    }
    return {
      async list(filters) {
        if (failNextRead.current) {
          failNextRead.current = false;
          throw new TypeError(
            'Sample inventory refresh failure. The preceding save succeeded.',
          );
        }
        const q = filters.q?.trim().toLowerCase();
        const items = data.current
          .map(recalculate)
          .filter(
            (medicine) =>
              (!q ||
                medicine.displayName.toLowerCase().includes(q) ||
                medicine.scientificName.toLowerCase().includes(q)) &&
              (!filters.status || medicine.indicators.includes(filters.status)),
          );
        return { items, total: items.length, subscriptionStatus };
      },
      async createMedicine(input) {
        await beforeSave();
        writable();
        uniqueName(input.displayName);
        const medicine: InventoryMedicine = {
          ...input,
          id: crypto.randomUUID(),
          batches: [],
          availableQuantity: 0,
          indicators: ['LOW_STOCK'],
        };
        data.current.push(medicine);
        return recalculate(medicine);
      },
      async updateMedicine(id, input) {
        await beforeSave();
        writable();
        uniqueName(input.displayName, id);
        const medicine = findMedicine(id);
        Object.assign(medicine, input);
        return recalculate(medicine);
      },
      async createBatch(id, input) {
        await beforeSave();
        writable();
        const medicine = findMedicine(id);
        if (
          medicine.batches.some(
            (batch) => batch.batchNumber === input.batchNumber,
          )
        )
          throw new ApiRequestError(
            409,
            'This batch number already exists for this medicine.',
          );
        const batch = {
          ...input,
          id: crypto.randomUUID(),
          barcode: input.barcode ?? null,
          indicators: [],
        };
        medicine.batches.push(batch);
        recalculate(medicine);
        return structuredClone(batch);
      },
      async updateBatch(id, input) {
        await beforeSave();
        writable();
        const medicine = data.current.find((item) =>
          item.batches.some((batch) => batch.id === id),
        );
        const batch = medicine?.batches.find((item) => item.id === id);
        if (!medicine || !batch)
          throw new ApiRequestError(404, 'Batch not found.');
        Object.assign(batch, input);
        recalculate(medicine);
        return structuredClone(batch);
      },
    };
  }, [subscriptionStatus]);
  return (
    <>
      <aside className="inventory-preview-notice">
        <strong>{t('Local development preview')}</strong>
        <p>
          {t(
            'Synthetic inventory using 3 November 2026 as the fixed date. No login or database requests. Controls below simulate subscription and save responses. Changes are in memory only and reset on refresh.',
          )}
        </p>
        <label htmlFor="preview-inventory-subscription">
          {t('Sample subscription')}
          <select
            id="preview-inventory-subscription"
            value={subscriptionStatus}
            onChange={(event) => {
              currentStatus.current = event.target.value as SubscriptionStatus;
              setSubscriptionStatus(currentStatus.current);
            }}
          >
            <option value="ACTIVE">{t('Active')}</option>
            <option value="EXPIRED">{t('Expired')}</option>
            <option value="SUSPENDED">{t('Suspended')}</option>
            <option value="NONE">{t('No active subscription')}</option>
          </select>
        </label>
        <label htmlFor="preview-save-scenario">
          {t('Next save response')}
          <select
            id="preview-save-scenario"
            value={saveScenario}
            onChange={(event) => {
              nextSave.current = event.target.value;
              setSaveScenario(event.target.value);
            }}
          >
            <option value="normal">{t('Normal save')}</option>
            <option value="slow">{t('Slow save (2 seconds)')}</option>
            <option value="validation">
              {t('Validation rejection (400)')}
            </option>
            <option value="forbidden">{t('Permission rejection (403)')}</option>
            <option value="not-found">{t('Missing record (404)')}</option>
            <option value="network">{t('Network failure')}</option>
            <option value="refresh-error">
              {t('Save succeeds, refresh fails')}
            </option>
          </select>
        </label>
      </aside>
      <InventoryView service={service} />
    </>
  );
}
