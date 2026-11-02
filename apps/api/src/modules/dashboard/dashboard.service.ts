import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { calculateDashboard } from '../../common/inventory-calculations';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(pharmacyId: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        pharmacyId: pharmacyId,
      },
      include: {
        batches: true, 
      },
    });

    const today = new Date();
    
    const dashboardStats = calculateDashboard(medicines, today);

    return dashboardStats;
  }
}