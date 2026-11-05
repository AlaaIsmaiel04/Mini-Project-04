import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { DutyPeriod, ListResponse } from '@smartshelf/contracts';
import type { PharmacistActor } from './adapters/temporary-auth.adapter';
import {
  assertSubscriptionActive,
  SUBSCRIPTION_STATUS,
  type SubscriptionStatusReader,
} from './adapters/temporary-subscription-status.adapter';
import type { DutyInputDto } from './dto/duty-input.dto';
import { dutyPeriodsOverlap } from './duty-overlap';
import { PharmacyLock } from './pharmacy-lock';
import {
  DUTY_PERIOD_STORE,
  type DutyPeriodRecord,
  type DutyPeriodStore,
  type DutyTimes,
} from './stores/duty-period.store';

const MAX_DUTY_MS = 24 * 60 * 60 * 1000;
export const DUTY_NOT_FOUND = 'Duty period not found';
export const DUTY_OVERLAP =
  'This duty period overlaps an existing duty period. Choose times that do not overlap; a period may start exactly when another one ends.';

function toDutyPeriod(period: DutyPeriodRecord): DutyPeriod {
  return {
    id: period.id,
    startsAt: period.startsAt.toISOString(),
    endsAt: period.endsAt.toISOString(),
  };
}

// The DTO has already checked that both values are instants with an offset.
function toValidDutyTimes(input: DutyInputDto): DutyTimes {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const duration = endsAt.getTime() - startsAt.getTime();

  if (duration <= 0) {
    throw new BadRequestException('endsAt must be after startsAt');
  }
  if (duration > MAX_DUTY_MS) {
    throw new BadRequestException(
      'A duty period cannot be longer than 24 hours',
    );
  }
  return { startsAt, endsAt };
}

async function assertNoOverlap(
  store: DutyPeriodStore,
  pharmacyId: string,
  times: DutyTimes,
  editedId?: string,
): Promise<void> {
  // Only periods that end after the new start can overlap it.
  const candidates = await store.listEndingAfter([pharmacyId], times.startsAt);
  const overlaps = candidates.some(
    (period) => period.id !== editedId && dutyPeriodsOverlap(times, period),
  );
  if (overlaps) throw new ConflictException(DUTY_OVERLAP);
}

@Injectable()
export class DutyPeriodService {
  private readonly logger = new Logger(DutyPeriodService.name);

  constructor(
    @Inject(DUTY_PERIOD_STORE) private readonly periods: DutyPeriodStore,
    @Inject(SUBSCRIPTION_STATUS)
    private readonly subscriptions: SubscriptionStatusReader,
    @Inject(PharmacyLock) private readonly lock: PharmacyLock,
  ) {}

  async listOwn(actor: PharmacistActor): Promise<ListResponse<DutyPeriod>> {
    const periods = await this.periods.listForPharmacy(actor.pharmacyId);
    return { items: periods.map(toDutyPeriod), total: periods.length };
  }

  async create(
    actor: PharmacistActor,
    input: DutyInputDto,
  ): Promise<DutyPeriod> {
    await this.assertCanChange(actor);
    const times = toValidDutyTimes(input);
    const period = await this.exclusive(actor.pharmacyId, async (store) => {
      await assertNoOverlap(store, actor.pharmacyId, times);
      return store.create(actor.pharmacyId, times);
    });
    return toDutyPeriod(period);
  }

  async update(
    actor: PharmacistActor,
    id: string,
    input: DutyInputDto,
  ): Promise<DutyPeriod> {
    await this.assertCanChange(actor);
    const times = toValidDutyTimes(input);
    const period = await this.exclusive(actor.pharmacyId, async (store) => {
      const existing = await store.findForPharmacy(actor.pharmacyId, id);
      if (!existing) throw this.notFound(actor, id);
      await assertNoOverlap(store, actor.pharmacyId, times, id);
      return store.update(actor.pharmacyId, id, times);
    });
    return toDutyPeriod(period);
  }

  async remove(actor: PharmacistActor, id: string): Promise<void> {
    await this.assertCanChange(actor);
    const deleted = await this.exclusive(actor.pharmacyId, (store) =>
      store.delete(actor.pharmacyId, id),
    );
    if (!deleted) throw this.notFound(actor, id);
  }

  // Every duty write takes its turn, so an overlap check cannot be overtaken by
  // another write of the same pharmacy before its own write happens.
  private exclusive<T>(
    pharmacyId: string,
    work: (store: DutyPeriodStore) => Promise<T>,
  ): Promise<T> {
    return this.lock.runExclusive(pharmacyId, () =>
      this.periods.transaction(work, pharmacyId),
    );
  }

  private assertCanChange(actor: PharmacistActor): Promise<void> {
    return assertSubscriptionActive(
      this.subscriptions,
      actor.pharmacyId,
      this.logger,
    );
  }

  // The store only looks inside the actor's pharmacy, so another pharmacy's period
  // and one that does not exist give the same answer and reveal nothing.
  private notFound(actor: PharmacistActor, id: string): NotFoundException {
    this.logger.warn(
      `Pharmacy ${actor.pharmacyId} requested duty period ${id}, which it does not own`,
    );
    return new NotFoundException(DUTY_NOT_FOUND);
  }
}
