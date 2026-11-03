export const DUTY_PERIOD_STORE = Symbol('DUTY_PERIOD_STORE');

export interface DutyTimes {
  startsAt: Date;
  endsAt: Date;
}

export interface DutyPeriodRecord extends DutyTimes {
  id: string;
  pharmacyId: string;
}

export type DutyWriteResult =
  | { status: 'saved'; period: DutyPeriodRecord }
  | { status: 'overlap' }
  | { status: 'not_found' };

/**
 * Every lookup by id also takes the pharmacy, so a guessed id is simply not found.
 * The overlap check and the write are one atomic store operation, which lets the
 * database implementation hold a per-pharmacy lock around both.
 */
export interface DutyPeriodStore {
  // Ordered by start.
  listForPharmacy(pharmacyId: string): Promise<DutyPeriodRecord[]>;
  // Periods that are current or upcoming at the given instant, ordered by start.
  listEndingAfter(pharmacyIds: string[], at: Date): Promise<DutyPeriodRecord[]>;
  createIfNoOverlap(
    pharmacyId: string,
    times: DutyTimes,
  ): Promise<Exclude<DutyWriteResult, { status: 'not_found' }>>;
  // Ignores the period being edited when checking for overlaps.
  updateIfNoOverlap(
    pharmacyId: string,
    id: string,
    times: DutyTimes,
  ): Promise<DutyWriteResult>;
  // Returns false when the pharmacy has no period with this id.
  delete(pharmacyId: string, id: string): Promise<boolean>;
}
