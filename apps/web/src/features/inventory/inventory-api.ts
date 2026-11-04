import type {
  Batch,
  CreateBatchInput,
  InventoryMedicine,
  InventoryFilters,
  InventoryResponse,
  MedicineInput,
  UpdateBatchInput,
} from '@smartshelf/contracts';
import { createApiClient } from '../../lib/api';

export interface InventoryService {
  list: (
    filters: InventoryFilters,
    signal?: AbortSignal,
  ) => Promise<InventoryResponse>;
  createMedicine: (input: MedicineInput) => Promise<InventoryMedicine>;
  updateMedicine: (
    id: string,
    input: MedicineInput,
  ) => Promise<InventoryMedicine>;
  createBatch: (medicineId: string, input: CreateBatchInput) => Promise<Batch>;
  updateBatch: (id: string, input: UpdateBatchInput) => Promise<Batch>;
}

export function createInventoryService(
  accessToken: string,
  onUnauthorized: () => void,
): InventoryService {
  const request = createApiClient(accessToken, onUnauthorized);
  return {
    async list(filters, signal) {
      const query = new URLSearchParams();
      if (filters.q?.trim()) query.set('q', filters.q.trim());
      if (filters.status) query.set('status', filters.status);
      return request<InventoryResponse>(`/pharmacist/medicines?${query}`, {
        signal,
      });
    },
    createMedicine(input) {
      return request<InventoryMedicine>('/pharmacist/medicines', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    updateMedicine(id, input) {
      return request<InventoryMedicine>(
        `/pharmacist/medicines/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );
    },
    createBatch(medicineId, input) {
      return request<Batch>(
        `/pharmacist/medicines/${encodeURIComponent(medicineId)}/batches`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    updateBatch(id, input) {
      // Explicit allowlist: immutable fields cannot leak into PATCH at runtime.
      const { quantity, expiryDate, storageLocation } = input;
      return request<Batch>(`/pharmacist/batches/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity, expiryDate, storageLocation }),
      });
    },
  };
}
