import type {
  MedicineAvailabilityStore,
  MedicineBatchStock,
} from '../stores/medicine-availability.store';

export interface StockedMedicine {
  pharmacyId: string;
  displayName: string;
  scientificName: string;
  batches: { quantity: number; expiryDate: string }[];
}

// Test only: never bind this in a module.
export class InMemoryMedicineAvailabilityStore implements MedicineAvailabilityStore {
  constructor(private readonly medicines: StockedMedicine[]) {}

  async listBatchesOfMatchingMedicines(
    q: string,
  ): Promise<MedicineBatchStock[]> {
    const wanted = q.toLowerCase();
    return this.medicines
      .filter(
        (medicine) =>
          medicine.displayName.toLowerCase().includes(wanted) ||
          medicine.scientificName.toLowerCase().includes(wanted),
      )
      .flatMap((medicine) =>
        medicine.batches.map((batch) => ({
          ...batch,
          pharmacyId: medicine.pharmacyId,
        })),
      );
  }
}
