import { Prisma } from '@prisma/client';

export interface Batch {
  quantity: number;
  cost: Prisma.Decimal;
  expiryDate: Date;
}

export interface Medicine {
  threshold: number;
  batches: Batch[];
}

export interface DashboardMetrics {
  totalMedicines: number;
  totalAvailableUnits: number;
  totalValue: string; 
  wasteValue: string; 
  attentionItems: number;
}

export function getAmmanMidnight(date: Date): Date {
  const ammanString = date.toLocaleString('en-US', { timeZone: 'Asia/Amman' });
  const ammanDate = new Date(ammanString);
  ammanDate.setHours(0, 0, 0, 0);
  return ammanDate;
}

export function calculateDashboard(medicines: Medicine[], businessDate: Date): DashboardMetrics {
  const todayAmman = getAmmanMidnight(businessDate);
  const plus90Amman = new Date(todayAmman);
  plus90Amman.setDate(todayAmman.getDate() + 90);

  let totalMedicines = medicines.length;
  let totalAvailableUnits = 0;
  let totalValue = new Prisma.Decimal(0);
  let wasteValue = new Prisma.Decimal(0);
  let attentionItems = 0;

  for (const med of medicines) {
    let medTotalUnits = 0;
    let isLowStock = false;
    let hasExpiringOrExpired = false;

    for (const batch of med.batches) {
      if (batch.quantity <= 0) continue; 

      const batchExpiry = getAmmanMidnight(batch.expiryDate);

      if (batchExpiry < todayAmman) {
        const batchWaste = batch.cost.mul(batch.quantity);
        wasteValue = wasteValue.add(batchWaste);
        hasExpiringOrExpired = true;
      } else {
        medTotalUnits += batch.quantity;
        const batchValue = batch.cost.mul(batch.quantity);
        totalValue = totalValue.add(batchValue);
        
        if (batchExpiry <= plus90Amman) {
          hasExpiringOrExpired = true;
        }
      }
    }

    if (medTotalUnits <= med.threshold) {
      isLowStock = true;
    }

    if (isLowStock || hasExpiringOrExpired) {
      attentionItems++;
    }
    
    totalAvailableUnits += medTotalUnits;
  }

  return {
    totalMedicines,
    totalAvailableUnits,
    totalValue: totalValue.toFixed(2), 
    wasteValue: wasteValue.toFixed(2),
    attentionItems,
  };
}