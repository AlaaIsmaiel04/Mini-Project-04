import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dutyInput, localDutyInput, toLocalDateTime } from './duty-time';
test('local duty input round-trips as UTC instants with an explicit timezone', () => {
  const local = '2026-11-05T20:00';
  const instant = localDutyInput(local);
  assert.match(instant, /Z$/);
  assert.equal(toLocalDateTime(instant), local);
  const period = dutyInput(local, '2026-11-06T08:00');
  assert.equal(
    Date.parse(period.endsAt) - Date.parse(period.startsAt),
    12 * 3600000,
  );
  assert.equal(
    Date.parse(dutyInput(local, '2026-11-06T20:00').endsAt) -
      Date.parse(instant),
    86400000,
  );
});
test('reject invalid calendar values, missing/end-first/equal and overlong periods', () => {
  for (const input of [
    '',
    '2026-02-30T08:00',
    '2026-13-01T08:00',
    '2026-11-05T25:00',
    '2026-11-05T08:00Z',
  ])
    assert.throws(() => localDutyInput(input));
  assert.throws(() => dutyInput('2026-11-05T20:00', '2026-11-05T20:00'));
  assert.throws(() => dutyInput('2026-11-05T20:00', '2026-11-05T19:59'));
  assert.throws(() => dutyInput('2026-11-05T20:00', '2026-11-06T20:01'));
});
