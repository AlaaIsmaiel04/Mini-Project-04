import { Prisma } from '@prisma/client';
import type { BatchIndicator, Indicator } from '@smartshelf/contracts';

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
    day: 'numeric',
  }).formatToParts(date);

  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  return new Date(Date.UTC(year, month, day));
}

// Shared date/stock rules extended from Mohammad's calculation helper.
export function calculateBatchIndicators(
  batch: Pick<Batch, 'expiryDate'>,
  businessDate: Date,
): BatchIndicator[] {
  const todayAmman = getAmmanMidnight(businessDate);
  const plus90Amman = new Date(todayAmman.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiry = getAmmanMidnight(batch.expiryDate);
  if (expiry < todayAmman) return ['EXPIRED'];
  if (expiry <= plus90Amman) return ['EXPIRING_SOON'];
  return [];
}

export function calculateMedicineInventory(
  medicine: Medicine,
  businessDate: Date,
) {
  let availableQuantity = 0;
  let totalValue = new Prisma.Decimal(0);
  let wasteValue = new Prisma.Decimal(0);
  let expired = false;
  let expiringSoon = false;
  for (const batch of medicine.batches) {
    if (batch.quantity <= 0) continue;
    const flags = calculateBatchIndicators(batch, businessDate);
    if (flags.includes('EXPIRED')) {
      expired = true;
      wasteValue = wasteValue.add(batch.cost.mul(batch.quantity));
    } else {
      availableQuantity += batch.quantity;
      totalValue = totalValue.add(batch.cost.mul(batch.quantity));
      if (flags.includes('EXPIRING_SOON')) expiringSoon = true;
    }
  }
  const indicators: Indicator[] = [];
  if (availableQuantity <= medicine.threshold) indicators.push('LOW_STOCK');
  if (expired) indicators.push('EXPIRED');
  if (expiringSoon) indicators.push('EXPIRING_SOON');
  if (!indicators.length) indicators.push('HEALTHY');
  return { availableQuantity, indicators, totalValue, wasteValue };
}

export function calculateDashboard(
  medicines: Medicine[],
  businessDate: Date,
): DashboardMetrics {
  const totalMedicines = medicines.length;
  let totalAvailableUnits = 0;
  let totalValue = new Prisma.Decimal(0);
  let wasteValue = new Prisma.Decimal(0);
  let attentionItems = 0;

  for (const med of medicines) {
    const result = calculateMedicineInventory(med, businessDate);
    if (!result.indicators.includes('HEALTHY')) attentionItems++;
    totalAvailableUnits += result.availableQuantity;
    totalValue = totalValue.add(result.totalValue);
    wasteValue = wasteValue.add(result.wasteValue);
  }

  return {
    totalMedicines,
    totalAvailableUnits,
    totalValue: totalValue.toFixed(2),
    wasteValue: wasteValue.toFixed(2),
    attentionItems,
  };
}

// Public helper shared with inventory consumers; monetary values remain Decimal.
export function calculateMedicine(
  batches: Batch[],
  threshold: number,
  today: Date,
) {
  return calculateMedicineInventory({ batches, threshold }, today);
}

export function calculateDashboardDetails(
  medicines: (Medicine & { id: string; displayName: string })[],
  today: Date,
) {
  const totals = calculateDashboard(medicines, today);
  const attentionItems = medicines.flatMap((medicine) => {
    const result = calculateMedicine(
      medicine.batches,
      medicine.threshold,
      today,
    );
    return result.indicators.includes('HEALTHY')
      ? []
      : [
          {
            medicineId: medicine.id,
            displayName: medicine.displayName,
            indicators: result.indicators,
          },
        ];
  });
  const batches = medicines.flatMap((m) => m.batches);
  return {
    totalMedicines: totals.totalMedicines,
    totalUnits: totals.totalAvailableUnits,
    inventoryValue: totals.totalValue,
    expectedWaste: totals.wasteValue,
    expiringSoonBatchCount: batches.filter((b) =>
      calculateBatchIndicators(b, today).includes('EXPIRING_SOON'),
    ).length,
    expiredBatchCount: batches.filter((b) =>
      calculateBatchIndicators(b, today).includes('EXPIRED'),
    ).length,
    lowStockMedicineCount: attentionItems.filter((m) =>
      m.indicators.includes('LOW_STOCK'),
    ).length,
    attentionItems,
  };
}
