import { Decimal } from '@prisma/client/runtime/library';

export type Indicator = 'EXPIRED' | 'EXPIRING_SOON' | 'LOW_STOCK' | 'HEALTHY';

export interface BatchInput {
  quantity: number;
  cost: Decimal | number;
  expiryDate: Date;
}

export interface MedicineInput {
  threshold: number;
  batches: BatchInput[];
}

export interface MedicineCalculationResult {
  indicators: Indicator[];
  totalAvailableQuantity: number;
  totalExpiredQuantity: number;
  totalAvailableValue: number;
  totalWasteValue: number; 
}

export function calculateMedicine(
  batches: BatchInput[],
  threshold: number,
  today: Date
): MedicineCalculationResult {
  let totalAvailableQuantity = 0;
  let totalExpiredQuantity = 0;
  let totalAvailableValue = 0;
  let totalWasteValue = 0;

  let hasExpired = false;
  let hasExpiringSoon = false;

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const ninetyDaysFromToday = new Date(todayDate);
  ninetyDaysFromToday.setDate(todayDate.getDate() + 90);

  for (const batch of batches) {
    const qty = batch.quantity;
    const cost = Number(batch.cost); 
    const expiryDate = new Date(batch.expiryDate.getFullYear(), batch.expiryDate.getMonth(), batch.expiryDate.getDate());

    if (qty <= 0) continue; 

    if (expiryDate < todayDate) {
      hasExpired = true;
      totalExpiredQuantity += qty;
      totalWasteValue += qty * cost; 
    } else {
      totalAvailableQuantity += qty;
      totalAvailableValue += qty * cost; 

      if (expiryDate <= ninetyDaysFromToday) {
        hasExpiringSoon = true;
      }
    }
  }

  const indicators: Indicator[] = [];

  if (hasExpired) indicators.push('EXPIRED');
  if (hasExpiringSoon) indicators.push('EXPIRING_SOON');
  
  if (totalAvailableQuantity <= threshold) indicators.push('LOW_STOCK');

  if (!hasExpired && !hasExpiringSoon && totalAvailableQuantity > threshold) {
    indicators.push('HEALTHY');
  }

  return {
    indicators,
    totalAvailableQuantity,
    totalExpiredQuantity,
    totalAvailableValue,
    totalWasteValue,
  };
}

export function calculateDashboard(
  medicines: MedicineInput[],
  today: Date
) {
  let totalAvailableUnits = 0;
  let totalAvailableValue = 0;
  let totalWasteValue = 0;
  let expiringBatchesCount = 0;
  let expiredBatchesCount = 0;
  let lowStockMedicinesCount = 0;

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ninetyDaysFromToday = new Date(todayDate);
  ninetyDaysFromToday.setDate(todayDate.getDate() + 90);

  for (const medicine of medicines) {
    const medResult = calculateMedicine(medicine.batches, medicine.threshold, today);
    
    totalAvailableUnits += medResult.totalAvailableQuantity;
    totalAvailableValue += medResult.totalAvailableValue;
    totalWasteValue += medResult.totalWasteValue;

    if (medResult.indicators.includes('LOW_STOCK')) {
      lowStockMedicinesCount++;
    }

    for (const batch of medicine.batches) {
      if (batch.quantity <= 0) continue;
      
      const expiryDate = new Date(batch.expiryDate.getFullYear(), batch.expiryDate.getMonth(), batch.expiryDate.getDate());
      
      if (expiryDate < todayDate) {
        expiredBatchesCount++;
      } else if (expiryDate <= ninetyDaysFromToday) {
        expiringBatchesCount++;
      }
    }
  }

  return {
    totalAvailableUnits,
    totalAvailableValue,
    expiringBatchesCount,
    lowStockMedicinesCount,
    expiredBatchesCount,
    totalWasteValue,
  };
}