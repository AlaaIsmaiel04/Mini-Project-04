import type { PublicDutyPeriod, PublicPharmacy } from '@smartshelf/contracts';
import type { DutyTimes } from '../pharmacy/stores/duty-period.store';
import type { PharmacyRecord } from '../pharmacy/stores/pharmacy.store';

function toPublicDuty(period: DutyTimes): PublicDutyPeriod {
  return {
    startsAt: period.startsAt.toISOString(),
    endsAt: period.endsAt.toISOString(),
  };
}

// Duty intervals are half-open: the start instant is on duty, the end instant is not.
function findCurrentDuty(periods: DutyTimes[], now: Date): DutyTimes | null {
  const at = now.getTime();
  return (
    periods.find(
      (period) =>
        period.startsAt.getTime() <= at && at < period.endsAt.getTime(),
    ) ?? null
  );
}

function findNextDuty(periods: DutyTimes[], now: Date): DutyTimes | null {
  const at = now.getTime();
  return periods.reduce<DutyTimes | null>((next, period) => {
    if (period.startsAt.getTime() <= at) return next;
    if (!next || period.startsAt.getTime() < next.startsAt.getTime()) {
      return period;
    }
    return next;
  }, null);
}

/**
 * The public privacy boundary. Every field is copied by name, including the nested
 * periods, so extra fields on a database record can never reach a citizen.
 */
export function toPublicPharmacy(
  pharmacy: PharmacyRecord,
  periods: DutyTimes[],
  now: Date,
): PublicPharmacy {
  const currentDuty = findCurrentDuty(periods, now);
  const nextDuty = findNextDuty(periods, now);

  return {
    name: pharmacy.name,
    area: pharmacy.area,
    address: pharmacy.address,
    phone: pharmacy.phone,
    onDutyNow: currentDuty !== null,
    currentDuty: currentDuty && toPublicDuty(currentDuty),
    nextDuty: nextDuty && toPublicDuty(nextDuty),
    inventoryUpdatedAt: pharmacy.inventoryUpdatedAt?.toISOString() ?? null,
  };
}
