import { Injectable } from '@nestjs/common';
import { dataUnavailable } from '../../pharmacy/adapters/temporary-unavailable-stores';

export const MEDICINE_AVAILABILITY_STORE = Symbol(
  'MEDICINE_AVAILABILITY_STORE',
);

export interface MedicineAvailabilityStore {
  /**
   * Ids of pharmacies, each once, with a medicine whose display or scientific name
   * partially matches q (case-insensitive) and a batch with quantity above zero that
   * is not expired on `today` (YYYY-MM-DD). Subscription status is checked separately.
   */
  findPharmacyIdsWithEligibleStock(q: string, today: string): Promise<string[]>;
}

// TEMPORARY: replace when Mustafa/Shiam merge.
@Injectable()
export class TemporaryUnavailableMedicineAvailabilityStore implements MedicineAvailabilityStore {
  findPharmacyIdsWithEligibleStock = dataUnavailable;
}
