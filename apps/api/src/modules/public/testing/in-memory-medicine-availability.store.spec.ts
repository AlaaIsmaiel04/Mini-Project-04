import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryMedicineAvailabilityStore } from './in-memory-medicine-availability.store';

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
      const batches = await store.listBatchesOfMatchingMedicines(q);

      assert.deepEqual(
        batches.map((batch) => batch.pharmacyId),
        ['a'],
      );
    }
  });

  it('returns nothing when no name matches', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('a', [{ quantity: 5, expiryDate: '2027-01-01' }]),
    ]);

    assert.deepEqual(await store.listBatchesOfMatchingMedicines('brufen'), []);
  });

  it('returns one row per batch, whatever the stock', async () => {
    const store = new InMemoryMedicineAvailabilityStore([
      medicine('a', [
        { quantity: 0, expiryDate: '2027-01-01' },
        { quantity: 9, expiryDate: '2020-01-01' },
      ]),
      medicine('a', [{ quantity: 3, expiryDate: '2027-03-01' }], 'Amoxil 250'),
    ]);

    assert.deepEqual(await store.listBatchesOfMatchingMedicines('amox'), [
      { pharmacyId: 'a', quantity: 0, expiryDate: '2027-01-01' },
      { pharmacyId: 'a', quantity: 9, expiryDate: '2020-01-01' },
      { pharmacyId: 'a', quantity: 3, expiryDate: '2027-03-01' },
    ]);
  });
});
