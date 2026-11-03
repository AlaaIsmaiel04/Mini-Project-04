import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryDutyPeriodStore } from './in-memory-duty-period.store';
import { InMemoryPharmacyStore } from './in-memory-pharmacy.store';

const PHARMACY_A = '11111111-1111-4111-8111-111111111111';
const PHARMACY_B = '22222222-2222-4222-8222-222222222222';

const times = (startsAt: string, endsAt: string) => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
});

const OVERNIGHT = times(
  '2026-11-04T20:00:00+03:00',
  '2026-11-05T08:00:00+03:00',
);

describe('InMemoryDutyPeriodStore', () => {
  it('finds, changes and deletes a period within its own pharmacy', async () => {
    const store = new InMemoryDutyPeriodStore();
    const created = await store.create(PHARMACY_A, OVERNIGHT);
    const later = times(
      '2026-11-06T20:00:00+03:00',
      '2026-11-07T08:00:00+03:00',
    );

    const found = await store.findForPharmacy(PHARMACY_A, created.id);
    const updated = await store.update(PHARMACY_A, created.id, later);
    const deleted = await store.delete(PHARMACY_A, created.id);

    assert.equal(found?.id, created.id);
    assert.equal(updated.startsAt.getTime(), later.startsAt.getTime());
    assert.equal(deleted, true);
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 0);
  });

  it('does not find, change or delete a period through another pharmacy', async () => {
    const store = new InMemoryDutyPeriodStore();
    const created = await store.create(PHARMACY_A, OVERNIGHT);

    const found = await store.findForPharmacy(PHARMACY_B, created.id);
    const deleted = await store.delete(PHARMACY_B, created.id);

    assert.equal(found, null);
    assert.equal(deleted, false);
    await assert.rejects(store.update(PHARMACY_B, created.id, OVERNIGHT));
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 1);
  });

  it('returns the snapshot taken before a slow read finished', async () => {
    let finishRead = () => {};
    const store = new InMemoryDutyPeriodStore(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );

    const reading = store.listForPharmacy(PHARMACY_A);
    await store.create(PHARMACY_A, OVERNIGHT);
    finishRead();

    assert.deepEqual(await reading, []);
  });

  it('excludes a period from listEndingAfter at its exact end', async () => {
    const store = new InMemoryDutyPeriodStore();
    await store.create(PHARMACY_A, OVERNIGHT);

    const atEnd = await store.listEndingAfter([PHARMACY_A], OVERNIGHT.endsAt);
    const beforeEnd = await store.listEndingAfter(
      [PHARMACY_A],
      new Date(OVERNIGHT.endsAt.getTime() - 1),
    );

    assert.equal(atEnd.length, 0);
    assert.equal(beforeEnd.length, 1);
  });
});

describe('InMemoryPharmacyStore', () => {
  const pharmacy = {
    id: PHARMACY_A,
    name: 'Central',
    area: 'Downtown',
    address: '12 Main Street',
    phone: '+962 6 555 0100',
    inventoryUpdatedAt: null,
  };

  it('matches area exactly, ignoring case and surrounding spaces', async () => {
    const store = new InMemoryPharmacyStore([pharmacy]);

    assert.equal((await store.list({ area: '  DOWNTOWN ' })).length, 1);
    assert.equal((await store.list({ area: 'Down' })).length, 0);
    assert.equal((await store.list({})).length, 1);
  });

  it('updates only the editable fields', async () => {
    const store = new InMemoryPharmacyStore([pharmacy]);

    const updated = await store.updateProfile(PHARMACY_A, {
      area: 'Uptown',
      address: '99 New Street',
      phone: '+962 6 555 0199',
      name: 'Renamed',
      id: PHARMACY_B,
    } as never);

    assert.equal(updated?.name, 'Central');
    assert.equal(updated?.id, PHARMACY_A);
    assert.equal(updated?.area, 'Uptown');
  });
});
