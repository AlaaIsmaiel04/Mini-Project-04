import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryMedicineAvailabilityStore } from './in-memory-medicine-availability.store';

const TODAY = '2026-11-04';

const medicine = (
  pharmacyId: string,
  batches: { quantity: number; expiryDate: string }[],
  displayName = 'Amoxil 500',
) => ({ pharmacyId, displayName, scientificName: 'Amoxicillin', batches });

describe('InMemoryMedicineAvailabilityStore', () => {
  it('matches display and scientific names partially, ignoring case', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('a', [{ quantity: 5, expiryDate: '2027-01-01' }]),
    ]);

    for (const q of ['amox', 'XIL 5', 'CILLIN']) {
      assert.deepEqual(await store.findPharmacyIdsWithEligibleStock(q, TODAY), [
        'a',
      ]);
    }
  });

  it('counts a batch expiring today but not one that expired yesterday', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('today', [{ quantity: 1, expiryDate: TODAY }]),
      medicine('yesterday', [{ quantity: 1, expiryDate: '2026-11-03' }]),
    ]);

    assert.deepEqual(
      await store.findPharmacyIdsWithEligibleStock('amox', TODAY),
      ['today'],
    );
  });

  it('excludes zero-only and expired-only stock', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('zero', [{ quantity: 0, expiryDate: '2027-01-01' }]),
      medicine('expired', [{ quantity: 9, expiryDate: '2026-01-01' }]),
      medicine('split', [
        { quantity: 0, expiryDate: '2027-01-01' },
        { quantity: 9, expiryDate: '2026-01-01' },
      ]),
    ]);

    assert.deepEqual(
      await store.findPharmacyIdsWithEligibleStock('amox', TODAY),
      [],
    );
  });

  it('returns a pharmacy once when several medicines and batches match', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('a', [
        { quantity: 1, expiryDate: '2027-01-01' },
        { quantity: 2, expiryDate: '2027-02-01' },
      ]),
      medicine('a', [{ quantity: 3, expiryDate: '2027-03-01' }], 'Amoxil 250'),
    ]);

    assert.deepEqual(
      await store.findPharmacyIdsWithEligibleStock('amox', TODAY),
      ['a'],
    );
  });
});
