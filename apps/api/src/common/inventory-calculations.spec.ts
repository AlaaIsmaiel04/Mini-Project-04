/// <reference types="jest" />
import { Prisma } from '@prisma/client';
import { calculateDashboard, getAmmanMidnight } from './inventory-calculations';

describe('Inventory Calculations', () => {
  it('should calculate metrics correctly handling all date and threshold rules', () => {
    const businessDate = new Date('2026-11-04T12:00:00Z'); 
    const today = getAmmanMidnight(businessDate);
    
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const plus90 = new Date(today); plus90.setDate(today.getDate() + 90);
    const plus91 = new Date(today); plus91.setDate(today.getDate() + 91);

    const medicines = [
      {
        threshold: 10,
        batches: [
          { quantity: 5, cost: new Prisma.Decimal('10.00'), expiryDate: yesterday }, 
          { quantity: 0, cost: new Prisma.Decimal('100.00'), expiryDate: plus91 }    
        ]
      },
      {
        threshold: 20,
        batches: [
          { quantity: 10, cost: new Prisma.Decimal('5.00'), expiryDate: today },     
          { quantity: 10, cost: new Prisma.Decimal('5.00'), expiryDate: plus90 },   
        ]
      },
      {
        threshold: 5,
        batches: [
          { quantity: 10, cost: new Prisma.Decimal('2.00'), expiryDate: plus91 }     
        ]
      },
      {
        threshold: 50, 
        batches: [
          { quantity: 10, cost: new Prisma.Decimal('1.00'), expiryDate: yesterday }, 
          { quantity: 10, cost: new Prisma.Decimal('1.00'), expiryDate: plus90 },    
        ]
      }
    ];

    const result = calculateDashboard(medicines, businessDate);

    expect(result.totalMedicines).toBe(4);
    expect(result.totalAvailableUnits).toBe(40); 
    expect(result.totalValue).toBe('130.00');    
    expect(result.wasteValue).toBe('60.00');    
    expect(result.attentionItems).toBe(3);     
  });
});