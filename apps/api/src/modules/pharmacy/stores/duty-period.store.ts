export const DUTY_PERIOD_STORE = Symbol('DUTY_PERIOD_STORE');

export interface DutyTimes {
  startsAt: Date;
  endsAt: Date;
}

export interface DutyPeriodRecord extends DutyTimes {
  id: string;
  pharmacyId: string;
}

/** Every lookup by id also takes the pharmacy, so a guessed id is simply not found. */
export interface DutyPeriodStore {
  // Ordered by start.
  listForPharmacy(pharmacyId: string): Promise<DutyPeriodRecord[]>;
  // Periods that are current or upcoming at the given instant, ordered by start.
  listEndingAfter(pharmacyIds: string[], at: Date): Promise<DutyPeriodRecord[]>;
  findForPharmacy(
    pharmacyId: string,
    id: string,
  ): Promise<DutyPeriodRecord | null>;
  create(pharmacyId: string, times: DutyTimes): Promise<DutyPeriodRecord>;
  // The caller has already found this period in the same transaction.
  update(
    pharmacyId: string,
    id: string,
    times: DutyTimes,
  ): Promise<DutyPeriodRecord>;
  // Returns false when the pharmacy has no period with this id.
  delete(pharmacyId: string, id: string): Promise<boolean>;
  /**
   * Runs work so that a check and the write that depends on it commit together, using
   * the store it is given. The database version is planned in ../README.md.
   */
  transaction<T>(
    work: (store: DutyPeriodStore) => Promise<T>,
    pharmacyId?: string,
  ): Promise<T>;
}
