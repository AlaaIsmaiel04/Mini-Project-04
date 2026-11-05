// اختبارات بواسطة Codex — حالات الاشتراك وحدود التواريخ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveSubscriptionStatus,
  type SubscriptionState,
} from './subscription-status';

const subscription: SubscriptionState = {
  startDate: new Date('2026-11-02T00:00:00Z'),
  endDate: new Date('2026-11-10T00:00:00Z'),
  suspended: false,
};

test('no subscription returns NONE', () => {
  assert.equal(effectiveSubscriptionStatus(null, '2026-11-02'), 'NONE');
});
test('a future start returns NONE', () => {
  assert.equal(effectiveSubscriptionStatus(subscription, '2026-11-01'), 'NONE');
});
test('the start date is inclusive', () => {
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-02'),
    'ACTIVE',
  );
});
test('a date inside the interval is ACTIVE', () => {
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-06'),
    'ACTIVE',
  );
});
test('the end date is inclusive', () => {
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-10'),
    'ACTIVE',
  );
});
test('the next day after the end is EXPIRED', () => {
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-11'),
    'EXPIRED',
  );
});
test('suspension takes precedence over future, active and expired dates', () => {
  for (const today of ['2026-11-01', '2026-11-02', '2026-11-11']) {
    assert.equal(
      effectiveSubscriptionStatus({ ...subscription, suspended: true }, today),
      'SUSPENDED',
    );
  }
});
test('the result changes with the supplied day without mutating stored data', () => {
  const before = structuredClone(subscription);
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-10'),
    'ACTIVE',
  );
  assert.equal(
    effectiveSubscriptionStatus(subscription, '2026-11-11'),
    'EXPIRED',
  );
  assert.deepEqual(subscription, before);
});
