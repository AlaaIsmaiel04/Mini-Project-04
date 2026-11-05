import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Dashboard } from '@smartshelf/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { requirePharmacy, type Actor } from '../../common/security';
import { businessDate } from '../../common/business-date';
import { effectiveSubscriptionStatus } from '../../common/subscription-status';
import { calculateDashboardDetails } from '../../common/inventory-calculations';
import { CLOCK, type Clock } from '../pharmacy/clock';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}
  async getDashboardData(actor: Actor): Promise<Dashboard> {
    const pharmacyId = requirePharmacy(actor);
    const now = this.clock.now();
    return this.prisma.$transaction(
      async (tx) => {
        const pharmacy = await tx.pharmacy.findUnique({
          where: { id: pharmacyId },
          include: {
            subscription: true,
            medicines: {
              include: { batches: true },
              orderBy: { displayName: 'asc' },
            },
          },
        });
        if (!pharmacy) throw new NotFoundException('Pharmacy not found.');
        return {
          pharmacyName: pharmacy.name,
          subscriptionStatus: effectiveSubscriptionStatus(
            pharmacy.subscription,
            businessDate(now),
          ),
          ...calculateDashboardDetails(
            pharmacy.medicines.map((m) => ({
              id: m.id,
              displayName: m.displayName,
              threshold: m.reorderThreshold,
              batches: m.batches.map((b) => ({
                quantity: b.quantity,
                cost: b.unitCost,
                expiryDate: b.expiryDate,
              })),
            })),
            now,
          ),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
