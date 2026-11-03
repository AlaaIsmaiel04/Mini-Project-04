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
import {
  DUTY_PERIOD_STORE,
  type DutyPeriodRecord,
  type DutyPeriodStore,
  type DutyTimes,
} from './stores/duty-period.store';

const MAX_DUTY_MS = 24 * 60 * 60 * 1000;
const DUTY_NOT_FOUND = 'Duty period not found';
const DUTY_OVERLAP = 'This duty period overlaps another duty period';

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

@Injectable()
export class DutyPeriodService {
  private readonly logger = new Logger(DutyPeriodService.name);

  constructor(
    @Inject(DUTY_PERIOD_STORE) private readonly periods: DutyPeriodStore,
    @Inject(SUBSCRIPTION_STATUS)
    private readonly subscriptions: SubscriptionStatusReader,
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
    const result = await this.periods.createIfNoOverlap(
      actor.pharmacyId,
      toValidDutyTimes(input),
    );
    if (result.status === 'overlap') throw new ConflictException(DUTY_OVERLAP);
    return toDutyPeriod(result.period);
  }

  async update(
    actor: PharmacistActor,
    id: string,
    input: DutyInputDto,
  ): Promise<DutyPeriod> {
    await this.assertCanChange(actor);
    const result = await this.periods.updateIfNoOverlap(
      actor.pharmacyId,
      id,
      toValidDutyTimes(input),
    );
    if (result.status === 'not_found') throw this.notFound(actor, id);
    if (result.status === 'overlap') throw new ConflictException(DUTY_OVERLAP);
    return toDutyPeriod(result.period);
  }

  async remove(actor: PharmacistActor, id: string): Promise<void> {
    await this.assertCanChange(actor);
    const deleted = await this.periods.delete(actor.pharmacyId, id);
    if (!deleted) throw this.notFound(actor, id);
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
