import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { dutyPeriodsOverlap } from './duty-overlap';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { InMemoryDutyPeriodStore } from './testing/in-memory-duty-period.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';

const PHARMACY_A = '11111111-1111-4111-8111-111111111111';
const PHARMACY_B = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

const times = (startsAt: string, endsAt: string) => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
});

// 20:00 -> 08:00 the next day in Amman, crossing midnight.
const OVERNIGHT = {
  startsAt: '2026-11-04T20:00:00+03:00',
  endsAt: '2026-11-05T08:00:00+03:00',
};
const FREE_SLOT = {
  startsAt: '2026-11-10T20:00:00+03:00',
  endsAt: '2026-11-11T08:00:00+03:00',
};
const ANOTHER_SLOT = {
  startsAt: '2026-11-12T20:00:00+03:00',
  endsAt: '2026-11-13T08:00:00+03:00',
};

describe('dutyPeriodsOverlap against 20:00 -> 08:00', () => {
  const existing = times(OVERNIGHT.startsAt, OVERNIGHT.endsAt);

  const cases: [string, string, string, boolean][] = [
    [
      'ends exactly when it starts',
      '2026-11-04T19:00:00+03:00',
      '2026-11-04T20:00:00+03:00',
      false,
    ],
    [
      'starts exactly when it ends',
      '2026-11-05T08:00:00+03:00',
      '2026-11-05T10:00:00+03:00',
      false,
    ],
    [
      'ends one millisecond before it starts',
      '2026-11-04T19:00:00+03:00',
      '2026-11-04T19:59:59.999+03:00',
      false,
    ],
    [
      'is on the next night',
      '2026-11-05T20:00:00+03:00',
      '2026-11-06T08:00:00+03:00',
      false,
    ],
    [
      'ends one millisecond after it starts',
      '2026-11-04T19:00:00+03:00',
      '2026-11-04T20:00:00.001+03:00',
      true,
    ],
    [
      'starts one millisecond before it ends',
      '2026-11-05T07:59:59.999+03:00',
      '2026-11-05T10:00:00+03:00',
      true,
    ],
    ['is identical', OVERNIGHT.startsAt, OVERNIGHT.endsAt, true],
    [
      'is inside it after midnight',
      '2026-11-05T02:00:00+03:00',
      '2026-11-05T03:00:00+03:00',
      true,
    ],
    [
      'crosses its midnight',
      '2026-11-04T23:00:00+03:00',
      '2026-11-05T01:00:00+03:00',
      true,
    ],
    [
      'contains it',
      '2026-11-04T19:00:00+03:00',
      '2026-11-05T09:00:00+03:00',
      true,
    ],
    [
      'is written in another offset but overlaps',
      '2026-11-04T23:00:00Z',
      '2026-11-05T01:00:00Z',
      true,
    ],
    [
      'is written in another offset and is adjacent',
      '2026-11-05T05:00:00Z',
      '2026-11-05T07:00:00Z',
      false,
    ],
  ];

  for (const [label, startsAt, endsAt, expected] of cases) {
    it(`${expected ? 'overlaps' : 'allows'} a period that ${label}`, () => {
      const candidate = times(startsAt, endsAt);

      assert.equal(dutyPeriodsOverlap(candidate, existing), expected);
      assert.equal(dutyPeriodsOverlap(existing, candidate), expected);
    });
  }
});

describe('DutyPeriodService with simultaneous requests', () => {
  const actorOf = (pharmacyId: string) => ({
    userId: USER_ID,
    role: 'PHARMACIST' as const,
    pharmacyId,
  });
  const A = actorOf(PHARMACY_A);

  const subscriptions = new InMemorySubscriptionStatus();
  subscriptions.set(PHARMACY_A, 'ACTIVE');
  subscriptions.set(PHARMACY_B, 'ACTIVE');

  // Every read waits for the next turn of the event loop, so simultaneous requests
  // all read before any of them writes unless something makes them take turns.
  function setup(lock = new PharmacyLock()) {
    const store = new InMemoryDutyPeriodStore(
      () => new Promise((resolve) => setImmediate(resolve)),
    );
    return {
      store,
      service: new DutyPeriodService(store, subscriptions, lock),
    };
  }

  async function outcomes(requests: Promise<unknown>[]) {
    const results = await Promise.allSettled(requests);
    return {
      saved: results.filter((result) => result.status === 'fulfilled').length,
      conflicts: results.filter(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof ConflictException,
      ).length,
    };
  }

  it('control: without the lock both requests save an overlap', async () => {
    const noLock = {
      runExclusive: (_pharmacyId: string, work: () => Promise<unknown>) =>
        work(),
    } as unknown as PharmacyLock;
    const { store, service } = setup(noLock);

    const result = await outcomes([
      service.create(A, OVERNIGHT),
      service.create(A, OVERNIGHT),
    ]);

    // If this ever stops racing, the tests below no longer prove anything.
    assert.deepEqual(result, { saved: 2, conflicts: 0 });
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 2);
  });

  it('lets exactly one of two identical requests save', async () => {
    const { store, service } = setup();

    const result = await outcomes([
      service.create(A, OVERNIGHT),
      service.create(A, OVERNIGHT),
    ]);

    assert.deepEqual(result, { saved: 1, conflicts: 1 });
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 1);
  });

  it('lets exactly one of twenty overlapping requests save', async () => {
    const { store, service } = setup();

    const result = await outcomes(
      Array.from({ length: 20 }, (_, index) =>
        service.create(A, {
          startsAt: `2026-11-04T20:${String(index).padStart(2, '0')}:00+03:00`,
          endsAt: OVERNIGHT.endsAt,
        }),
      ),
    );

    assert.deepEqual(result, { saved: 1, conflicts: 19 });
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 1);
  });

  it('lets simultaneous adjacent requests all save', async () => {
    const { service } = setup();

    const result = await outcomes([
      service.create(A, OVERNIGHT),
      service.create(A, {
        startsAt: OVERNIGHT.endsAt,
        endsAt: '2026-11-05T20:00:00+03:00',
      }),
      service.create(A, {
        startsAt: '2026-11-03T20:00:00+03:00',
        endsAt: OVERNIGHT.startsAt,
      }),
    ]);

    assert.deepEqual(result, { saved: 3, conflicts: 0 });
  });

  it('lets only one of two edits move into the same free slot', async () => {
    const { store, service } = setup();
    const first = await service.create(A, OVERNIGHT);
    const second = await service.create(A, ANOTHER_SLOT);

    const result = await outcomes([
      service.update(A, first.id, FREE_SLOT),
      service.update(A, second.id, FREE_SLOT),
    ]);

    assert.deepEqual(result, { saved: 1, conflicts: 1 });
    const stored = await store.listForPharmacy(PHARMACY_A);
    assert.equal(stored.length, 2);
    assert.equal(
      dutyPeriodsOverlap(stored[0], stored[1]),
      false,
      'the stored periods must not overlap',
    );
  });

  it('lets only one of a create and an edit take the same free slot', async () => {
    const { store, service } = setup();
    const existing = await service.create(A, OVERNIGHT);

    const result = await outcomes([
      service.create(A, FREE_SLOT),
      service.update(A, existing.id, FREE_SLOT),
    ]);

    assert.deepEqual(result, { saved: 1, conflicts: 1 });
    const stored = await store.listForPharmacy(PHARMACY_A);
    assert.equal(dutyPeriodsOverlap(stored[0], stored[1]), false);
  });

  it('lets a create queued behind a delete use the freed times', async () => {
    const { store, service } = setup();
    const existing = await service.create(A, OVERNIGHT);

    const [, created] = await Promise.all([
      service.remove(A, existing.id),
      service.create(A, OVERNIGHT),
    ]);

    const stored = await store.listForPharmacy(PHARMACY_A);
    assert.deepEqual(
      stored.map((period) => period.id),
      [created.id],
    );
  });

  it('lets different pharmacies save the same times at once', async () => {
    const { store, service } = setup();

    const result = await outcomes([
      service.create(A, OVERNIGHT),
      service.create(actorOf(PHARMACY_B), OVERNIGHT),
    ]);

    assert.deepEqual(result, { saved: 2, conflicts: 0 });
    assert.equal((await store.listForPharmacy(PHARMACY_A)).length, 1);
    assert.equal((await store.listForPharmacy(PHARMACY_B)).length, 1);
  });

  it('keeps working for the pharmacy after a rejected request', async () => {
    const { service } = setup();
    await service.create(A, OVERNIGHT);

    await assert.rejects(service.create(A, OVERNIGHT), ConflictException);

    const next = await service.create(A, FREE_SLOT);
    assert.ok(next.id);
  });
});
