import { Injectable } from '@nestjs/common';
import { UnavailableDataAdapter } from './unavailable-data.adapter';
import { calculateDashboard } from '../../common/inventory-calculations';

@Injectable()
export class DashboardService {
  constructor(private readonly dataAdapter: UnavailableDataAdapter) {}

  async getDashboardData(pharmacyId: string) {
    const medicinesData = await this.dataAdapter.getMedicinesScopedToPharmacy(pharmacyId);
    
    const today = new Date();
    const metrics = calculateDashboard(medicinesData, today);

    return {
      pharmacyName: 'Pending DB Relation',
      subscriptionStatus: 'ACTIVE',
      totalMedicines: metrics.totalMedicines,
      attentionItems: metrics.attentionItems,
      totalValue: metrics.totalValue,
      wasteValue: metrics.wasteValue,
    };
  }
}