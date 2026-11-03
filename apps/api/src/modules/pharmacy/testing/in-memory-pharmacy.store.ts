import type { UpdateProfileInput } from '@smartshelf/contracts';
import type {
  PharmacyFilter,
  PharmacyRecord,
  PharmacyStore,
} from '../stores/pharmacy.store';

// Test only: never bind this in a module.
export class InMemoryPharmacyStore implements PharmacyStore {
  private readonly pharmacies = new Map<string, PharmacyRecord>();

  constructor(pharmacies: PharmacyRecord[] = []) {
    pharmacies.forEach((pharmacy) =>
      this.pharmacies.set(pharmacy.id, { ...pharmacy }),
    );
  }

  async findById(id: string): Promise<PharmacyRecord | null> {
    const pharmacy = this.pharmacies.get(id);
    return pharmacy ? { ...pharmacy } : null;
  }

  async list({ area }: PharmacyFilter): Promise<PharmacyRecord[]> {
    const wanted = area?.trim().toLowerCase();
    return [...this.pharmacies.values()]
      .filter((pharmacy) => !wanted || pharmacy.area.toLowerCase() === wanted)
      .map((pharmacy) => ({ ...pharmacy }));
  }

  async updateProfile(
    id: string,
    { area, address, phone }: UpdateProfileInput,
  ): Promise<PharmacyRecord | null> {
    const pharmacy = this.pharmacies.get(id);
    if (!pharmacy) return null;
    Object.assign(pharmacy, { area, address, phone });
    return { ...pharmacy };
  }
}
