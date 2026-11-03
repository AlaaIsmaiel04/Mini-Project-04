import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { FixedClock } from '../pharmacy/testing/fixed-clock';
import { PublicPharmacyDto } from './dto/public-pharmacy.dto';
import { toPublicPharmacy } from './public-pharmacy.mapper';

const pharmacy = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Central',
  area: 'Downtown',
  address: '12 Main Street',
  phone: '+962 6 555 0100',
  inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
};

// 20:00 -> 08:00 the next day in Amman, crossing midnight.
const overnight = {
  startsAt: new Date('2026-11-04T20:00:00+03:00'),
  endsAt: new Date('2026-11-05T08:00:00+03:00'),
};
const following = {
  startsAt: new Date('2026-11-06T20:00:00+03:00'),
  endsAt: new Date('2026-11-07T08:00:00+03:00'),
};
const later = {
  startsAt: new Date('2026-11-08T20:00:00+03:00'),
  endsAt: new Date('2026-11-09T08:00:00+03:00'),
};

const overnightJson = {
  startsAt: '2026-11-04T17:00:00.000Z',
  endsAt: '2026-11-05T05:00:00.000Z',
};
const followingJson = {
  startsAt: '2026-11-06T17:00:00.000Z',
  endsAt: '2026-11-07T05:00:00.000Z',
};

const mapAt = (instant: string, periods = [overnight]) =>
  toPublicPharmacy(pharmacy, periods, new FixedClock(new Date(instant)).now());

describe('toPublicPharmacy duty periods', () => {
  it('is on duty at 02:00 inside an overnight period', () => {
    const result = mapAt('2026-11-05T02:00:00+03:00');

    assert.equal(result.onDutyNow, true);
    assert.deepEqual(result.currentDuty, overnightJson);
  });

  it('is on duty at the exact start instant', () => {
    assert.equal(mapAt('2026-11-04T20:00:00+03:00').onDutyNow, true);
  });

  it('is on duty one millisecond before the end', () => {
    assert.equal(mapAt('2026-11-05T07:59:59.999+03:00').onDutyNow, true);
  });

  it('is off duty at the exact end instant', () => {
    const result = mapAt('2026-11-05T08:00:00+03:00');

    assert.equal(result.onDutyNow, false);
    assert.equal(result.currentDuty, null);
    assert.equal(result.nextDuty, null);
  });

  it('shows the period as next before it starts', () => {
    const result = mapAt('2026-11-04T19:59:59+03:00');

    assert.equal(result.onDutyNow, false);
    assert.equal(result.currentDuty, null);
    assert.deepEqual(result.nextDuty, overnightJson);
  });

  it('shows current and next together', () => {
    const result = mapAt('2026-11-05T02:00:00+03:00', [overnight, following]);

    assert.deepEqual(result.currentDuty, overnightJson);
    assert.deepEqual(result.nextDuty, followingJson);
  });

  it('picks the earliest upcoming period in any input order', () => {
    const result = mapAt('2026-11-05T09:00:00+03:00', [
      later,
      following,
      overnight,
    ]);

    assert.deepEqual(result.nextDuty, followingJson);
  });

  it('returns nulls when there are no periods', () => {
    const result = mapAt('2026-11-05T02:00:00+03:00', []);

    assert.equal(result.onDutyNow, false);
    assert.equal(result.currentDuty, null);
    assert.equal(result.nextDuty, null);
  });
});

describe('toPublicPharmacy allowlist', () => {
  const privateRecord = {
    ...pharmacy,
    pharmacyId: pharmacy.id,
    quantity: 120,
    batchNumber: 'B-1',
    unitCost: '2.50',
    storageLocation: 'Shelf 3',
    barcode: '123456',
    subscription: { status: 'ACTIVE', suspended: false },
    subscriptionStatus: 'ACTIVE',
    users: [{ email: 'staff@example.test', passwordHash: 'hash' }],
    medicines: [{ id: 'medicine-id', batches: [] }],
  };
  const privatePeriod = {
    ...overnight,
    id: '44444444-4444-4444-8444-444444444444',
    pharmacyId: pharmacy.id,
    createdBy: 'staff@example.test',
  };
  const now = new Date('2026-11-05T02:00:00+03:00');

  it('returns exactly the public fields from a record with private fields', () => {
    const result = toPublicPharmacy(privateRecord, [privatePeriod], now);

    assert.deepEqual(result, {
      name: 'Central',
      area: 'Downtown',
      address: '12 Main Street',
      phone: '+962 6 555 0100',
      onDutyNow: true,
      currentDuty: overnightJson,
      nextDuty: null,
      inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
    });
  });

  it('keeps only timestamps in nested periods', () => {
    const upcoming = new Date('2026-11-04T10:00:00+03:00');
    const result = toPublicPharmacy(privateRecord, [privatePeriod], upcoming);

    assert.deepEqual(Object.keys(result.nextDuty ?? {}), [
      'startsAt',
      'endsAt',
    ]);
  });

  it('has no private value anywhere in the JSON', () => {
    const json = JSON.stringify(
      toPublicPharmacy(privateRecord, [privatePeriod], now),
    );

    for (const secret of [
      pharmacy.id,
      privatePeriod.id,
      'staff@example.test',
      'B-1',
      'Shelf 3',
      'quantity',
      'subscription',
      'unitCost',
    ]) {
      assert.equal(json.includes(secret), false, `leaked ${secret}`);
    }
  });

  it('returns null when the inventory was never updated', () => {
    const result = toPublicPharmacy(
      { ...pharmacy, inventoryUpdatedAt: null },
      [],
      now,
    );

    assert.equal(result.inventoryUpdatedAt, null);
  });
});

describe('PublicPharmacyDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: PublicPharmacyDto });

  it('accepts mapper output with periods and with nulls', async () => {
    await validate(mapAt('2026-11-05T02:00:00+03:00', [overnight, following]));
    await validate(
      toPublicPharmacy(
        { ...pharmacy, inventoryUpdatedAt: null },
        [],
        new Date('2026-11-05T02:00:00+03:00'),
      ),
    );
  });

  it('rejects an extra field at the top level and in a nested period', async () => {
    const valid = mapAt('2026-11-05T02:00:00+03:00');

    await assert.rejects(validate({ ...valid, id: pharmacy.id }));
    await assert.rejects(
      validate({
        ...valid,
        currentDuty: { ...overnightJson, id: 'period-id' },
      }),
    );
  });
});
