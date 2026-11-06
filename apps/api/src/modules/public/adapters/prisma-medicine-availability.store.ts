import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { calendarString } from '../../../common/business-date';
import { PrismaService } from '../../../prisma/prisma.service';
import { escapeLikePattern } from '../../pharmacy/adapters/like-pattern';
import type {
  MedicineAvailabilityStore,
  MedicineBatchStock,
} from '../stores/medicine-availability.store';

@Injectable()
export class PrismaMedicineAvailabilityStore implements MedicineAvailabilityStore {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
  ) {}

  async listBatchesOfMatchingMedicines(
    q: string,
  ): Promise<MedicineBatchStock[]> {
    if (!this.prisma)
      throw new ServiceUnavailableException(
        'The database is not available yet',
      );

    const contains = escapeLikePattern(q);
    // Selects only what the availability rule needs: no name, cost or batch detail is read.
    const batches = await this.prisma.batch.findMany({
      where: {
        medicine: {
          OR: [
            { displayName: { contains, mode: 'insensitive' } },
            { scientificName: { contains, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        quantity: true,
        expiryDate: true,
        medicine: { select: { pharmacyId: true } },
      },
    });

    return batches.map((batch) => ({
      pharmacyId: batch.medicine.pharmacyId,
      quantity: batch.quantity,
      expiryDate: calendarString(batch.expiryDate),
    }));
  }
}
