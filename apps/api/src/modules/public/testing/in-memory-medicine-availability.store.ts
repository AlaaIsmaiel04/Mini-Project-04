import type { MedicineAvailabilityStore } from '../stores/medicine-availability.store';

export interface StockedMedicine {
  pharmacyId: string;
  displayName: string;
  scientificName: string;
  batches: { quantity: number; expiryDate: string }[];
}

// Test only: never bind this in a module.
export class InMemoryMedicineAvailabilityStore implements MedicineAvailabilityStore {
  constructor(private readonly medicines: StockedMedicine[]) {}

  async findPharmacyIdsWithEligibleStock(
    q: string,
    today: string,
  ): Promise<string[]> {
    const wanted = q.trim().toLowerCase();
    const matches = this.medicines.filter(
      (medicine) =>
        (medicine.displayName.toLowerCase().includes(wanted) ||
          medicine.scientificName.toLowerCase().includes(wanted)) &&
        // YYYY-MM-DD strings sort by date; a batch expiring today is not yet expired.
        medicine.batches.some(
          (batch) => batch.quantity > 0 && batch.expiryDate >= today,
        ),
    );
    return [...new Set(matches.map((medicine) => medicine.pharmacyId))];
  }
}
