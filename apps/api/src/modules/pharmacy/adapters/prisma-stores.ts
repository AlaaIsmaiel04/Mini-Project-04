import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { UpdateProfileInput } from '@smartshelf/contracts';
import { PrismaService } from '../../../prisma/prisma.service';
import { businessDate } from '../../../common/business-date';
import { effectiveSubscriptionStatus } from '../../../common/subscription-status';
import {
  INACTIVE_SUBSCRIPTION_REASONS,
  type SubscriptionStatusReader,
} from './temporary-subscription-status.adapter';
import type { PharmacyStore, PharmacyFilter } from '../stores/pharmacy.store';
import type { DutyPeriodStore, DutyTimes } from '../stores/duty-period.store';
import { CLOCK, type Clock } from '../clock';

function active(
  subscription: Parameters<typeof effectiveSubscriptionStatus>[0],
  today: string,
) {
  const status = effectiveSubscriptionStatus(subscription, today);
  if (status !== 'ACTIVE')
    throw new ForbiddenException(INACTIVE_SUBSCRIPTION_REASONS[status]);
}
@Injectable()
export class PrismaSubscriptionStatus implements SubscriptionStatusReader {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
    @Optional() @Inject(CLOCK) private readonly clock?: Clock,
  ) {}
  async getEffectiveStatus(id: string) {
    if (!this.prisma)
      throw new ServiceUnavailableException(
        'Subscription status is not available yet',
      );
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return effectiveSubscriptionStatus(
      pharmacy.subscription,
      businessDate(this.clock?.now()),
    );
  }
}
@Injectable()
export class PrismaPharmacyStore implements PharmacyStore {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
  ) {}
  private get db() {
    if (!this.prisma)
      throw new ServiceUnavailableException(
        'The database is not available yet',
      );
    return this.prisma;
  }
  findById(id: string) {
    return this.db.pharmacy.findUnique({ where: { id } });
  }
  list(filter: PharmacyFilter) {
    return this.db.pharmacy.findMany({
      where: filter.area
        ? { area: { equals: filter.area.trim(), mode: 'insensitive' } }
        : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
  updateProfile(id: string, input: UpdateProfileInput) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Pharmacy" WHERE id = ${id}::uuid FOR UPDATE`;
      const pharmacy = await tx.pharmacy.findUnique({
        where: { id },
        include: { subscription: true },
      });
      if (!pharmacy) return null;
      active(pharmacy.subscription, businessDate());
      return tx.pharmacy.update({
        where: { id },
        data: { area: input.area, address: input.address, phone: input.phone },
      });
    });
  }
}
@Injectable()
export class PrismaDutyPeriodStore implements DutyPeriodStore {
  private client?: Prisma.TransactionClient;
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
  ) {}
  private get db() {
    const db = this.client ?? this.prisma;
    if (!db)
      throw new ServiceUnavailableException(
        'The database is not available yet',
      );
    return db;
  }
  listForPharmacy(pharmacyId: string) {
    return this.db.dutyPeriod.findMany({
      where: { pharmacyId },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
  }
  listEndingAfter(pharmacyIds: string[], at: Date) {
    return this.db.dutyPeriod.findMany({
      where: { pharmacyId: { in: pharmacyIds }, endsAt: { gt: at } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
  }
  findForPharmacy(pharmacyId: string, id: string) {
    return this.db.dutyPeriod.findFirst({ where: { id, pharmacyId } });
  }
  create(pharmacyId: string, times: DutyTimes) {
    return this.db.dutyPeriod.create({ data: { pharmacyId, ...times } });
  }
  async update(pharmacyId: string, id: string, times: DutyTimes) {
    const result = await this.db.dutyPeriod.updateMany({
      where: { id, pharmacyId },
      data: times,
    });
    if (!result.count) throw new NotFoundException('Duty period not found');
    return this.db.dutyPeriod.findFirstOrThrow({ where: { id, pharmacyId } });
  }
  async delete(pharmacyId: string, id: string) {
    return (
      (await this.db.dutyPeriod.deleteMany({ where: { id, pharmacyId } }))
        .count > 0
    );
  }
  transaction<T>(
    work: (store: DutyPeriodStore) => Promise<T>,
    pharmacyId?: string,
  ): Promise<T> {
    if (!this.prisma)
      return Promise.reject(
        new ServiceUnavailableException('The database is not available yet'),
      );
    if (!pharmacyId)
      return Promise.reject(
        new Error('Duty transaction requires pharmacy scope'),
      );
    return this.prisma.$transaction(async (tx) => {
      // All writers for one pharmacy take this database row lock before reading overlaps.
      // PostgreSQL serializes separate Node processes as well as requests in one process.
      await tx.$queryRaw`SELECT id FROM "Pharmacy" WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
      const pharmacy = await tx.pharmacy.findUnique({
        where: { id: pharmacyId },
        include: { subscription: true },
      });
      if (!pharmacy) throw new NotFoundException('Pharmacy not found');
      active(pharmacy.subscription, businessDate());
      const store = new PrismaDutyPeriodStore(this.prisma);
      store.client = tx;
      return work(store);
    });
  }
}
