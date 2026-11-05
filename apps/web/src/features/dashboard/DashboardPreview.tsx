// Historical fixture, deliberately not imported by production routes.
export const dashboardFixture = {
  pharmacyName: 'Sample Pharmacy',
  subscriptionStatus: 'ACTIVE',
  totalMedicines: 1,
  totalUnits: 10,
  inventoryValue: '25.00',
  expiringSoonBatchCount: 1,
  lowStockMedicineCount: 1,
  expiredBatchCount: 1,
  expectedWaste: '12.00',
  attentionItems: [
    {
      medicineId: 'sample',
      displayName: 'Sample medicine',
      indicators: ['LOW_STOCK', 'EXPIRING_SOON'],
    },
  ],
} as const;
