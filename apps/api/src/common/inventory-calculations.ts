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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date);
  
  const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);
  
  return new Date(Date.UTC(year, month, day));
}

export function calculateDashboard(medicines: Medicine[], businessDate: Date): DashboardMetrics {
  const todayAmman = getAmmanMidnight(businessDate);
  
  const plus90Amman = new Date(todayAmman.getTime() + 90 * 24 * 60 * 60 * 1000);

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