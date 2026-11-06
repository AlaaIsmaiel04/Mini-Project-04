export const MEDICINE_AVAILABILITY_STORE = Symbol(
  'MEDICINE_AVAILABILITY_STORE',
);

// Only what the availability rule needs, so medicine names, batch numbers, costs and
// storage locations never reach the public service.
export interface MedicineBatchStock {
  pharmacyId: string;
  quantity: number;
  // Calendar date, YYYY-MM-DD.
  expiryDate: string;
}

export interface MedicineAvailabilityStore {
  /**
   * One row per batch of every medicine whose display or scientific name contains q,
   * ignoring case, whatever the stock. `PublicService` decides which batches count.
   * q is plain text, not a pattern, so % and _ must match literally.
   */
  listBatchesOfMatchingMedicines(q: string): Promise<MedicineBatchStock[]>;
}
