import type { DutyTimes } from './stores/duty-period.store';

/**
 * R-22. Duty periods are half-open intervals [startsAt, endsAt), so a period may
 * start at the exact instant another one ends.
 */
export function dutyPeriodsOverlap(
  candidate: DutyTimes,
  existing: DutyTimes,
): boolean {
  return (
    candidate.startsAt.getTime() < existing.endsAt.getTime() &&
    candidate.endsAt.getTime() > existing.startsAt.getTime()
  );
}
