// اختبارات بواسطة Codex — التوقيت والتواريخ ومؤشرات المخزون.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import {
  addCalendarDays,
  businessDate,
  parseCalendarDate,
} from './business-date';
import { effectiveSubscriptionStatus as effectiveSubscription } from './subscription-status';
import { toMedicine } from './inventory-mapper';

test('business midnight is based on Asia/Amman rather than server timezone', () => {
  assert.equal(
    businessDate(new Date('2026-11-01T20:59:59Z'), 'Asia/Amman'),
    '2026-11-01',
  );
  assert.equal(
    businessDate(new Date('2026-11-01T21:00:00Z'), 'Asia/Amman'),
    '2026-11-02',
  );
});

test('real calendar dates, leap years and 90-day boundary', () => {
  assert.equal(addCalendarDays('2026-11-02', 90), '2027-01-31');
  assert.equal(
    parseCalendarDate('2028-02-29').toISOString(),
    '2028-02-29T00:00:00.000Z',
  );
  for (const value of [
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-1-01',
    '2026-01-01T00:00:00Z',
  ]) {
    assert.throws(() => parseCalendarDate(value));
  }
});

test('subscription suspension precedence and inclusive boundaries', () => {
  const subscription = {
    id: 's',
    pharmacyId: 'p',
    suspended: false,
    startDate: parseCalendarDate('2026-11-02'),
    endDate: parseCalendarDate('2026-11-10'),
  };
  assert.equal(effectiveSubscription(null, '2026-11-02'), 'NONE');
  assert.equal(effectiveSubscription(subscription, '2026-11-01'), 'NONE');
  assert.equal(effectiveSubscription(subscription, '2026-11-02'), 'ACTIVE');
  assert.equal(effectiveSubscription(subscription, '2026-11-10'), 'ACTIVE');
  assert.equal(effectiveSubscription(subscription, '2026-11-11'), 'EXPIRED');
  assert.equal(
    effectiveSubscription({ ...subscription, suspended: true }, '2026-11-11'),
    'SUSPENDED',
  );
});

test('simultaneous indicators, equality threshold, expiry today/+90/+91 and empty batches', () => {
  const medicine = {
    id: 'm',
    pharmacyId: 'p',
    normalizedName: 'demo',
    displayName: 'Demo',
    scientificName: 'Demo',
    category: 'Demo',
    reorderThreshold: 10,
  };
  const batch = (quantity: number, days: number) => ({
    id: `b${days}`,
    medicineId: 'm',
    batchNumber: `B${days}`,
    quantity,
    expiryDate: parseCalendarDate(addCalendarDays('2026-11-02', days)),
    storageLocation: 'A',
    unitCost: new Prisma.Decimal('2.50'),
    barcode: null,
  });
  const result = toMedicine(
    { ...medicine, batches: [batch(10, 90), batch(3, -1)] },
    '2026-11-02',
  );
  assert.equal(result.availableQuantity, 10);
  assert.deepEqual(
    new Set(result.indicators),
    new Set(['LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON']),
  );
  assert.equal(result.batches[0].unitCost, '2.50');
  assert.deepEqual(
    toMedicine(
      { ...medicine, batches: [batch(30, 91), batch(0, -1)] },
      '2026-11-02',
    ).indicators,
    ['HEALTHY'],
  );
  assert.deepEqual(
    toMedicine({ ...medicine, batches: [batch(30, 0)] }, '2026-11-02')
      .indicators,
    ['EXPIRING_SOON'],
  );
  assert.deepEqual(
    toMedicine({ ...medicine, batches: [] }, '2026-11-02').indicators,
    ['LOW_STOCK'],
  );
});
