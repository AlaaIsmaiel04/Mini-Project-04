import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Batch,
  InventoryMedicine,
  InventoryResponse,
} from '@smartshelf/contracts';
import type { Actor } from '../../common/security';
import { logAccessRejection, requirePharmacy } from '../../common/security';
import { businessDate, parseCalendarDate } from '../../common/business-date';
import { toBatch, toMedicine } from '../../common/inventory-mapper';
import { effectiveSubscriptionStatus } from '../../common/subscription-status';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBatchDto,
  InventoryQueryDto,
  MedicineDto,
  UpdateBatchDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: Actor,
    query: InventoryQueryDto,
  ): Promise<InventoryResponse> {
    const pharmacyId = requirePharmacy(actor);
    const today = businessDate();
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { subscription: true },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found.');
    const medicines = await this.prisma.medicine.findMany({
      where: {
        pharmacyId,
        ...(query.q
          ? {
              OR: [
                { displayName: { contains: query.q, mode: 'insensitive' } },
                { scientificName: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { batches: { orderBy: { batchNumber: 'asc' } } },
      orderBy: { displayName: 'asc' },
    });
    const items = medicines
      .map((m) => toMedicine(m, today))
      .filter((m) => !query.status || m.indicators.includes(query.status));
    return {
      items,
      total: items.length,
      subscriptionStatus: effectiveSubscriptionStatus(
        pharmacy.subscription,
        today,
      ),
    };
  }

  private async mutate<T>(
    actor: Actor,
    action: (
      tx: Prisma.TransactionClient,
      pharmacyId: string,
      today: string,
    ) => Promise<T>,
  ): Promise<T> {
    const pharmacyId = requirePharmacy(actor);
    const today = businessDate();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const pharmacy = await tx.pharmacy.findUnique({
          where: { id: pharmacyId },
          include: { subscription: true },
        });
        if (!pharmacy) throw new NotFoundException('Pharmacy not found.');
        const status = effectiveSubscriptionStatus(
          pharmacy.subscription,
          today,
        );
        if (status !== 'ACTIVE') {
          logAccessRejection('inactive_subscription', actor, {
            subscriptionStatus: status,
          });
          throw new ForbiddenException(
            `Subscription is ${status}; inventory is read-only.`,
          );
        }
        const saved = await action(tx, pharmacyId, today);
        await tx.pharmacy.update({
          where: { id: pharmacyId },
          data: { inventoryUpdatedAt: new Date() },
        });
        return saved;
      });
      this.logger.log(
        `Committed inventory mutation for pharmacy ${pharmacyId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException(
            'Medicine name or batch number already exists in this scope.',
          );
        if (error.code === 'P2025')
          throw new NotFoundException('Record not found.');
      }
      throw error;
    }
  }

  createMedicine(actor: Actor, dto: MedicineDto): Promise<InventoryMedicine> {
    return this.mutate(actor, async (tx, pharmacyId, today) => {
      const medicine = await tx.medicine.create({
        data: {
          ...dto,
          normalizedName: dto.displayName.toLowerCase(),
          pharmacyId,
        },
        include: { batches: true },
      });
      return toMedicine(medicine, today);
    });
  }

  updateMedicine(
    actor: Actor,
    id: string,
    dto: MedicineDto,
  ): Promise<InventoryMedicine> {
    return this.mutate(actor, async (tx, pharmacyId, today) => {
      const existing = await tx.medicine.findFirst({
        where: { id, pharmacyId },
        select: { id: true },
      });
      if (!existing) {
        logAccessRejection('resource_not_owned_or_missing', actor, {
          resourceKind: 'medicine',
          resourceId: id,
        });
        throw new NotFoundException('Medicine not found in your pharmacy.');
      }
      const medicine = await tx.medicine.update({
        where: { id },
        data: { ...dto, normalizedName: dto.displayName.toLowerCase() },
        include: { batches: true },
      });
      return toMedicine(medicine, today);
    });
  }

  createBatch(
    actor: Actor,
    medicineId: string,
    dto: CreateBatchDto,
  ): Promise<Batch> {
    return this.mutate(actor, async (tx, pharmacyId, today) => {
      const medicine = await tx.medicine.findFirst({
        where: { id: medicineId, pharmacyId },
        select: { id: true },
      });
      if (!medicine) {
        logAccessRejection('resource_not_owned_or_missing', actor, {
          resourceKind: 'medicine',
          resourceId: medicineId,
        });
        throw new NotFoundException('Medicine not found in your pharmacy.');
      }
      const batch = await tx.batch.create({
        data: {
          medicineId,
          batchNumber: dto.batchNumber,
          quantity: dto.quantity,
          expiryDate: parseCalendarDate(dto.expiryDate),
          storageLocation: dto.storageLocation,
          unitCost: new Prisma.Decimal(dto.unitCost),
          barcode: dto.barcode || null,
        },
      });
      return toBatch(batch, today);
    });
  }

  updateBatch(actor: Actor, id: string, dto: UpdateBatchDto): Promise<Batch> {
    return this.mutate(actor, async (tx, pharmacyId, today) => {
      const existing = await tx.batch.findFirst({
        where: { id, medicine: { pharmacyId } },
        select: { id: true },
      });
      if (!existing) {
        logAccessRejection('resource_not_owned_or_missing', actor, {
          resourceKind: 'batch',
          resourceId: id,
        });
        throw new NotFoundException('Batch not found in your pharmacy.');
      }
      const batch = await tx.batch.update({
        where: { id },
        data: {
          quantity: dto.quantity,
          expiryDate: parseCalendarDate(dto.expiryDate),
          storageLocation: dto.storageLocation,
        },
      });
      return toBatch(batch, today);
    });
  }
}
