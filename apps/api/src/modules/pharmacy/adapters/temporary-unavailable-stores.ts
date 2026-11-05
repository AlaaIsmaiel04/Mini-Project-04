import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { DutyPeriodStore } from '../stores/duty-period.store';
import type { PharmacyStore } from '../stores/pharmacy.store';

// TEMPORARY: replace when Mustafa/Shiam merge.
// Mustafa owns the Prisma schema. Until it is merged the API boots normally, but
// these stores refuse every call instead of returning empty or sample data.

export function dataUnavailable(): Promise<never> {
  return Promise.reject(
    new ServiceUnavailableException('The database is not available yet'),
  );
}

@Injectable()
export class TemporaryUnavailablePharmacyStore implements PharmacyStore {
  findById = dataUnavailable;
  list = dataUnavailable;
  updateProfile = dataUnavailable;
}

@Injectable()
export class TemporaryUnavailableDutyPeriodStore implements DutyPeriodStore {
  listForPharmacy = dataUnavailable;
  listEndingAfter = dataUnavailable;
  findForPharmacy = dataUnavailable;
  create = dataUnavailable;
  update = dataUnavailable;
  delete = dataUnavailable;
  transaction = dataUnavailable;
}
