// اختبارات بواسطة Codex: تجميع وتشغيل؛ الاختبار الأصلي للحسابات من محمد.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import { calculateDashboard, getAmmanMidnight } from './inventory-calculations';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Inventory Calculations', () => {
  it('should calculate metrics correctly handling all date and threshold rules', () => {
    const businessDate = new Date('2026-11-04T12:00:00Z');
    const today = getAmmanMidnight(businessDate);

    const yesterday = new Date(today.getTime() - DAY_MS);
    const plus90 = new Date(today.getTime() + 90 * DAY_MS);
    const plus91 = new Date(today.getTime() + 91 * DAY_MS);

    const medicines = [
      {
        threshold: 10,
        batches: [
          {
            quantity: 5,
            cost: new Prisma.Decimal('10.00'),
            expiryDate: yesterday,
          },
          {
            quantity: 0,
            cost: new Prisma.Decimal('100.00'),
            expiryDate: plus91,
          },
        ],
      },
      {
        threshold: 20,
        batches: [
          { quantity: 10, cost: new Prisma.Decimal('5.00'), expiryDate: today },
          {
            quantity: 10,
            cost: new Prisma.Decimal('5.00'),
            expiryDate: plus90,
          },
        ],
      },
      {
        threshold: 5,
        batches: [
          {
            quantity: 10,
            cost: new Prisma.Decimal('2.00'),
            expiryDate: plus91,
          },
        ],
      },
      {
        threshold: 50,
        batches: [
          {
            quantity: 10,
            cost: new Prisma.Decimal('1.00'),
            expiryDate: yesterday,
          },
          {
            quantity: 10,
            cost: new Prisma.Decimal('1.00'),
            expiryDate: plus90,
          },
        ],
      },
    ];

    const result = calculateDashboard(medicines, businessDate);

    assert.equal(result.totalMedicines, 4);
    assert.equal(result.totalAvailableUnits, 40);
    assert.equal(result.totalValue, '130.00');
    assert.equal(result.wasteValue, '60.00');
    assert.equal(result.attentionItems, 3);
  });
});
