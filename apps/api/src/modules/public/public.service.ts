import { Inject, Injectable } from '@nestjs/common';
import type { ListResponse, PublicPharmacy } from '@smartshelf/contracts';
import {
  SUBSCRIPTION_STATUS,
  type SubscriptionStatusReader,
} from '../pharmacy/adapters/temporary-subscription-status.adapter';
import { CLOCK, type Clock } from '../pharmacy/clock';
import {
  DUTY_PERIOD_STORE,
  type DutyPeriodStore,
} from '../pharmacy/stores/duty-period.store';
import {
  PHARMACY_STORE,
  type PharmacyRecord,
  type PharmacyStore,
} from '../pharmacy/stores/pharmacy.store';
import type { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { toPublicPharmacy } from './public-pharmacy.mapper';

@Injectable()
export class PublicService {
  constructor(
    @Inject(PHARMACY_STORE) private readonly pharmacies: PharmacyStore,
    @Inject(DUTY_PERIOD_STORE) private readonly periods: DutyPeriodStore,
    @Inject(SUBSCRIPTION_STATUS)
    private readonly subscriptions: SubscriptionStatusReader,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async listPharmacies({
    area,
    onDutyNow,
  }: PublicPharmaciesQueryDto): Promise<ListResponse<PublicPharmacy>> {
    const now = this.clock.now();
    // A blank area is the same as no area filter.
    const pharmacies = await this.pharmacies.list({ area: area || undefined });
    const listed = await this.keepActive(pharmacies);
    const periods = await this.periods.listEndingAfter(
      listed.map((pharmacy) => pharmacy.id),
      now,
    );

    const items = listed
      .map((pharmacy) =>
        toPublicPharmacy(
          pharmacy,
          periods.filter((period) => period.pharmacyId === pharmacy.id),
          now,
        ),
      )
      .filter((pharmacy) => !onDutyNow || pharmacy.onDutyNow)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { items, total: items.length };
  }

  // R-5: only pharmacies with an ACTIVE subscription appear publicly.
  private async keepActive(
    pharmacies: PharmacyRecord[],
  ): Promise<PharmacyRecord[]> {
    const statuses = await Promise.all(
      pharmacies.map((pharmacy) =>
        this.subscriptions.getEffectiveStatus(pharmacy.id),
      ),
    );
    return pharmacies.filter((_, index) => statuses[index] === 'ACTIVE');
  }
}
