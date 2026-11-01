// Shared API contract baseline approved by Alaa on 1 November 2026.
// Coordinate later changes with Alaa and the affected feature owners.

export type Role = 'OWNER' | 'PHARMACIST';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'NONE';

export type Indicator = 'HEALTHY' | 'EXPIRING_SOON' | 'LOW_STOCK' | 'EXPIRED';

// The signed-in account returned to the frontend.
// Never include a password or password hash.
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  pharmacyId: string | null;
}

// Request body sent when signing in.
export interface LoginInput {
  email: string;
  password: string;
}

// Response returned after successful sign-in.
export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

// Shared structure for list responses.
export interface ListResponse<T> {
  items: T[];
  total: number;
}

// Shared structure for backend errors.
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// Dates below are API strings, not JavaScript Date objects.
// Calendar dates: YYYY-MM-DD. Timestamps: ISO 8601 with an offset or Z.
// TypeScript types do not validate input; backend DTOs/services must do that.

export interface CreatePharmacyInput {
  name: string;
  area: string;
  address: string;
  phone: string;
}

export interface PharmacyProfile extends CreatePharmacyInput {
  id: string;
  inventoryUpdatedAt: string | null;
}

export type UpdateProfileInput = Pick<
  CreatePharmacyInput,
  'area' | 'address' | 'phone'
>;

export interface SubscriptionInput {
  startDate: string;
  endDate: string;
  suspended: boolean;
}

export interface Subscription extends SubscriptionInput {
  id: string;
}

export interface OwnerPharmacy extends PharmacyProfile {
  subscription: Subscription | null;
  subscriptionStatus: SubscriptionStatus;
}

export interface CreatePharmacistInput {
  email: string;
  password: string;
  pharmacyId: string;
}

export interface OwnerPharmacyFilters {
  q?: string;
  status?: SubscriptionStatus;
}

export interface MedicineInput {
  displayName: string;
  scientificName: string;
  category: string;
  reorderThreshold: number;
}

export interface CreateBatchInput {
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  storageLocation: string;
  // Decimal string, for example "2.50"; currency is not yet specified.
  unitCost: string;
  barcode?: string;
}

// The remaining creation fields cannot be edited after batch creation.
export type UpdateBatchInput = Pick<
  CreateBatchInput,
  'quantity' | 'expiryDate' | 'storageLocation'
>;

export type BatchIndicator = 'EXPIRED' | 'EXPIRING_SOON';

export interface Batch extends Omit<CreateBatchInput, 'barcode'> {
  id: string;
  barcode: string | null;
  indicators: BatchIndicator[];
}

export interface InventoryMedicine extends MedicineInput {
  id: string;
  availableQuantity: number;
  // Several indicators may apply at the same time.
  indicators: Indicator[];
  batches: Batch[];
}

export interface InventoryResponse extends ListResponse<InventoryMedicine> {
  subscriptionStatus: SubscriptionStatus;
}

export interface InventoryFilters {
  q?: string;
  status?: Indicator;
}

export interface AttentionItem {
  medicineId: string;
  displayName: string;
  indicators: Indicator[];
}

export interface Dashboard {
  pharmacyName: string;
  subscriptionStatus: SubscriptionStatus;
  totalMedicines: number;
  totalUnits: number;
  inventoryValue: string;
  expiringSoonBatchCount: number;
  lowStockMedicineCount: number;
  expiredBatchCount: number;
  expectedWaste: string;
  attentionItems: AttentionItem[];
}

export interface ProfileResponse {
  pharmacy: PharmacyProfile;
  subscriptionStatus: SubscriptionStatus;
}

export interface DutyInput {
  startsAt: string;
  endsAt: string;
}

export interface DutyPeriod extends DutyInput {
  id: string;
}

// Public periods intentionally contain timestamps only, without internal IDs.
export type PublicDutyPeriod = Pick<DutyInput, 'startsAt' | 'endsAt'>;

// Public endpoints must construct this allowlist explicitly at runtime.
// An interface alone cannot remove private fields from a database record.
export interface PublicPharmacy {
  name: string;
  area: string;
  address: string;
  phone: string;
  onDutyNow: boolean;
  currentDuty: PublicDutyPeriod | null;
  nextDuty: PublicDutyPeriod | null;
  inventoryUpdatedAt: string | null;
}

export interface PublicPharmacyFilters {
  area?: string;
  onDutyNow?: boolean;
}

export interface MedicineSearchFilters extends PublicPharmacyFilters {
  q: string;
}
