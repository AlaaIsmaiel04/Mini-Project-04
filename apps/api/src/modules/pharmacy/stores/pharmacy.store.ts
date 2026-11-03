import type { UpdateProfileInput } from '@smartshelf/contracts';

export const PHARMACY_STORE = Symbol('PHARMACY_STORE');

export interface PharmacyRecord {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  inventoryUpdatedAt: Date | null;
}

export interface PharmacyFilter {
  // Case-insensitive exact match after trimming.
  area?: string;
}

export interface PharmacyStore {
  findById(id: string): Promise<PharmacyRecord | null>;
  list(filter: PharmacyFilter): Promise<PharmacyRecord[]>;
  // Accepts only the editable fields, so name and id cannot change here.
  updateProfile(
    id: string,
    input: UpdateProfileInput,
  ): Promise<PharmacyRecord | null>;
}
