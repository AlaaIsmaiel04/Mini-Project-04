import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toBusinessDate } from './temporary-business-date.adapter';

describe('toBusinessDate', () => {
  const cases: [string, string, string][] = [
    [
      'one millisecond before midnight',
      '2026-11-04T20:59:59.999Z',
      '2026-11-04',
    ],
    ['exactly midnight in Amman', '2026-11-04T21:00:00.000Z', '2026-11-05'],
    ['the early morning', '2026-11-04T23:00:00.000Z', '2026-11-05'],
    [
      'an instant written in the Amman offset',
      '2026-11-05T02:00:00+03:00',
      '2026-11-05',
    ],
    ['the end of a month', '2026-11-30T21:00:00.000Z', '2026-12-01'],
    ['the end of a year', '2026-12-31T21:00:00.000Z', '2027-01-01'],
    ['a leap day', '2028-02-28T21:00:00.000Z', '2028-02-29'],
    ['the middle of summer', '2026-07-01T21:00:00.000Z', '2026-07-02'],
  ];

  for (const [label, instant, expected] of cases) {
    it(`gives ${expected} at ${label}`, () => {
      assert.equal(toBusinessDate(new Date(instant)), expected);
    });
  }

  it('does not depend on the server time zone', () => {
    const instant = new Date('2026-11-04T21:00:00.000Z');
    const original = process.env.TZ;
    const localDays = new Set<number>();

    try {
      for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
        process.env.TZ = zone;
        localDays.add(instant.getDate());
        assert.equal(toBusinessDate(instant), '2026-11-05');
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }

    // The zones really did change the local date, so the check above means something.
    assert.ok(localDays.size > 1);
  });
});
