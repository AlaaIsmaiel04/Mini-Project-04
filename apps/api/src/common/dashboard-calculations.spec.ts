import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  calculateMedicine,
  calculateDashboardDetails,
} from './inventory-calculations';
const today = new Date('2026-11-05T12:00:00Z');
const batch = (quantity: number, cost: string, day: string) => ({
  quantity,
  cost: new Prisma.Decimal(cost),
  expiryDate: new Date(day + 'T00:00:00Z'),
});
test('dashboard contract metrics, decimal values and all attention badges', () => {
  const result = calculateDashboardDetails(
    [
      {
        id: 'a',
        displayName: 'A',
        threshold: 10,
        batches: [
          batch(10, '2.50', '2026-11-05'),
          batch(3, '4.00', '2026-11-04'),
          batch(0, '9.99', '2026-11-04'),
        ],
      },
      {
        id: 'b',
        displayName: 'B',
        threshold: 1,
        batches: [batch(2, '0.10', '2027-02-04')],
      },
    ],
    today,
  );
  assert.equal(result.totalMedicines, 2);
  assert.equal(result.totalUnits, 12);
  assert.equal(result.inventoryValue, '25.20');
  assert.equal(result.expectedWaste, '12.00');
  assert.equal(result.expiringSoonBatchCount, 1);
  assert.equal(result.expiredBatchCount, 2);
  assert.equal(result.lowStockMedicineCount, 1);
  assert.deepEqual(result.attentionItems, [
    {
      medicineId: 'a',
      displayName: 'A',
      indicators: ['LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON'],
    },
  ]);
});
test('empty dashboard returns honest zero values and no attention items', () => {
  assert.deepEqual(calculateDashboardDetails([], today), {
    totalMedicines: 0,
    totalUnits: 0,
    inventoryValue: '0.00',
    expectedWaste: '0.00',
    expiringSoonBatchCount: 0,
    expiredBatchCount: 0,
    lowStockMedicineCount: 0,
    attentionItems: [],
  });
});
test('shared medicine helper handles today/+90/+91, equality and zero quantity', () => {
  assert.deepEqual(
    calculateMedicine([batch(10, '0.01', '2027-02-03')], 10, today).indicators,
    ['LOW_STOCK', 'EXPIRING_SOON'],
  );
  assert.deepEqual(
    calculateMedicine(
      [
        batch(11, '0.01', '2027-02-04'),
        batch(0, '99.00', '2026-11-04'),
        batch(0, '99.00', '2026-11-05'),
      ],
      10,
      today,
    ).indicators,
    ['HEALTHY'],
  );
  assert.deepEqual(calculateMedicine([], 0, today).indicators, ['LOW_STOCK']);
});
