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
  it('rejects an overlap but allows a period starting at the exact end', async () => {
    const store = new InMemoryDutyPeriodStore();
    await store.createIfNoOverlap(PHARMACY_A, OVERNIGHT);

    const overlap = await store.createIfNoOverlap(
      PHARMACY_A,
      times('2026-11-05T07:59:00+03:00', '2026-11-05T10:00:00+03:00'),
    );
    const adjacent = await store.createIfNoOverlap(
      PHARMACY_A,
      times('2026-11-05T08:00:00+03:00', '2026-11-05T10:00:00+03:00'),
    );

    assert.equal(overlap.status, 'overlap');
    assert.equal(adjacent.status, 'saved');
  });

  it('allows the same times at a different pharmacy', async () => {
    const store = new InMemoryDutyPeriodStore();
    await store.createIfNoOverlap(PHARMACY_A, OVERNIGHT);

    const result = await store.createIfNoOverlap(PHARMACY_B, OVERNIGHT);

    assert.equal(result.status, 'saved');
  });

  it('ignores the period being edited when checking for overlaps', async () => {
    const store = new InMemoryDutyPeriodStore();
    const created = await store.createIfNoOverlap(PHARMACY_A, OVERNIGHT);
    assert.equal(created.status, 'saved');
    if (created.status !== 'saved') return;

    const result = await store.updateIfNoOverlap(
      PHARMACY_A,
      created.period.id,
      times('2026-11-04T21:00:00+03:00', '2026-11-05T09:00:00+03:00'),
    );

    assert.equal(result.status, 'saved');
  });

  it('does not find a period through another pharmacy', async () => {
    const store = new InMemoryDutyPeriodStore();
    const created = await store.createIfNoOverlap(PHARMACY_A, OVERNIGHT);
    assert.equal(created.status, 'saved');
    if (created.status !== 'saved') return;

    const update = await store.updateIfNoOverlap(
      PHARMACY_B,
      created.period.id,
      OVERNIGHT,
    );
    const deleted = await store.delete(PHARMACY_B, created.period.id);

    assert.equal(update.status, 'not_found');
    assert.equal(deleted, false);
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 1);
  });

  it('excludes a period from listEndingAfter at its exact end', async () => {
    const store = new InMemoryDutyPeriodStore();
    await store.createIfNoOverlap(PHARMACY_A, OVERNIGHT);

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
