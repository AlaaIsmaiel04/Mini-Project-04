import type { Batch as DbBatch, Medicine as DbMedicine } from '@prisma/client';
import type {
  Batch,
  BatchIndicator,
  InventoryMedicine,
} from '@smartshelf/contracts';
import {
  calculateBatchIndicators,
  calculateMedicineInventory,
} from './inventory-calculations';
import { calendarString, parseCalendarDate } from './business-date';

export function batchIndicators(
  batch: DbBatch,
  today: string,
): BatchIndicator[] {
  return calculateBatchIndicators(batch, parseCalendarDate(today));
}

export function toBatch(batch: DbBatch, today: string): Batch {
  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    quantity: batch.quantity,
    expiryDate: calendarString(batch.expiryDate),
    storageLocation: batch.storageLocation,
    unitCost: batch.unitCost.toFixed(2),
    barcode: batch.barcode,
    indicators: batchIndicators(batch, today),
  };
}

export function toMedicine(
  medicine: DbMedicine & { batches: DbBatch[] },
  today: string,
): InventoryMedicine {
  const batches = medicine.batches.map((batch) => toBatch(batch, today));
  // Reuse Mohammad's pure calculations, adapting our Prisma field names.
  const { availableQuantity, indicators } = calculateMedicineInventory(
    {
      threshold: medicine.reorderThreshold,
      batches: medicine.batches.map((batch) => ({
        quantity: batch.quantity,
        cost: batch.unitCost,
        expiryDate: batch.expiryDate,
      })),
    },
    parseCalendarDate(today),
  );
  return {
    id: medicine.id,
    displayName: medicine.displayName,
    scientificName: medicine.scientificName,
    category: medicine.category,
    reorderThreshold: medicine.reorderThreshold,
    availableQuantity,
    indicators,
    batches,
  };
}
