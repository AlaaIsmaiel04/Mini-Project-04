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
import { toBusinessDate } from './adapters/temporary-business-date.adapter';
import type { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import type { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { toPublicPharmacy } from './public-pharmacy.mapper';
import {
  MEDICINE_AVAILABILITY_STORE,
  type MedicineAvailabilityStore,
  type MedicineBatchStock,
} from './stores/medicine-availability.store';

// R-24: one batch must both have units and not be expired. A batch expiring today is
// not expired yet (R-12), and YYYY-MM-DD strings sort by date.
function isAvailable(batch: MedicineBatchStock, today: string): boolean {
  return batch.quantity > 0 && batch.expiryDate >= today;
}

@Injectable()
export class PublicService {
  constructor(
    @Inject(PHARMACY_STORE) private readonly pharmacies: PharmacyStore,
    @Inject(DUTY_PERIOD_STORE) private readonly periods: DutyPeriodStore,
    @Inject(SUBSCRIPTION_STATUS)
    private readonly subscriptions: SubscriptionStatusReader,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MEDICINE_AVAILABILITY_STORE)
    private readonly medicines: MedicineAvailabilityStore,
  ) {}

  async listPharmacies({
    area,
    onDutyNow,
  }: PublicPharmaciesQueryDto): Promise<ListResponse<PublicPharmacy>> {
    const pharmacies = await this.listInArea(area);
    return this.toListing(pharmacies, onDutyNow, this.clock.now());
  }

  async searchMedicines({
    q,
    area,
    onDutyNow,
  }: MedicineSearchQueryDto): Promise<ListResponse<PublicPharmacy>> {
    const now = this.clock.now();
    const today = toBusinessDate(now);
    const batches = await this.medicines.listBatchesOfMatchingMedicines(q);
    const stocked = new Set(
      batches
        .filter((batch) => isAvailable(batch, today))
        .map((batch) => batch.pharmacyId),
    );

    // Starting from the pharmacies, not the batches, returns each pharmacy once.
    const pharmacies = await this.listInArea(area);
    return this.toListing(
      pharmacies.filter((pharmacy) => stocked.has(pharmacy.id)),
      onDutyNow,
      now,
    );
  }

  // A blank area is the same as no area filter.
  private listInArea(area?: string): Promise<PharmacyRecord[]> {
    return this.pharmacies.list({ area: area || undefined });
  }

  private async toListing(
    pharmacies: PharmacyRecord[],
    onDutyNow: boolean | undefined,
    now: Date,
  ): Promise<ListResponse<PublicPharmacy>> {
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
