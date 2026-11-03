import React, { useState, useEffect } from 'react';

interface DashboardMetrics {
  totalAvailableUnits: number;
  totalAvailableValue: number;
  expiringBatchesCount: number;
  lowStockMedicinesCount: number;
  expiredBatchesCount: number;
  totalWasteValue: number;
}

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setTimeout(() => {
      setMetrics({
        totalAvailableUnits: 150,
        totalAvailableValue: 1250.50,
        expiringBatchesCount: 2,
        lowStockMedicinesCount: 3,
        expiredBatchesCount: 1,
        totalWasteValue: 45.00,
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading pharmacy data...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-red-500">Error loading data.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Pharmacist Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h2 className="text-sm font-medium text-gray-500">Total Available Units</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalAvailableUnits}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-sm font-medium text-gray-500">Total Inventory Value</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">${metrics.totalAvailableValue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h2 className="text-sm font-medium text-gray-500">Low Stock Medicines</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.lowStockMedicinesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <h2 className="text-sm font-medium text-gray-500">Expiring Soon Batches</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.expiringBatchesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <h2 className="text-sm font-medium text-gray-500">Expired Batches</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.expiredBatchesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-700">
          <h2 className="text-sm font-medium text-gray-500">Total Waste Value</h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">${metrics.totalWasteValue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};