import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  ProfileResponse,
  SubscriptionStatus,
} from '@smartshelf/contracts';
import type { PharmacistActor } from './adapters/jwt-pharmacist.guard';
import {
  assertSubscriptionActive,
  SUBSCRIPTION_STATUS,
  type SubscriptionStatusReader,
} from './adapters/subscription-status-reader';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import {
  PHARMACY_STORE,
  type PharmacyRecord,
  type PharmacyStore,
} from './stores/pharmacy.store';

export const PHARMACY_NOT_FOUND = 'Pharmacy not found';

function toProfileResponse(
  pharmacy: PharmacyRecord,
  subscriptionStatus: SubscriptionStatus,
): ProfileResponse {
  return {
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      area: pharmacy.area,
      address: pharmacy.address,
      phone: pharmacy.phone,
      inventoryUpdatedAt: pharmacy.inventoryUpdatedAt?.toISOString() ?? null,
    },
    subscriptionStatus,
  };
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @Inject(PHARMACY_STORE) private readonly pharmacies: PharmacyStore,
    @Inject(SUBSCRIPTION_STATUS)
    private readonly subscriptions: SubscriptionStatusReader,
  ) {}

  async getOwnProfile(actor: PharmacistActor): Promise<ProfileResponse> {
    const pharmacy = await this.pharmacies.findById(actor.pharmacyId);
    if (!pharmacy) throw new NotFoundException(PHARMACY_NOT_FOUND);

    const status = await this.subscriptions.getEffectiveStatus(pharmacy.id);
    return toProfileResponse(pharmacy, status);
  }

  async updateOwnProfile(
    actor: PharmacistActor,
    input: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    await assertSubscriptionActive(
      this.subscriptions,
      actor.pharmacyId,
      this.logger,
    );

    const pharmacy = await this.pharmacies.updateProfile(actor.pharmacyId, {
      area: input.area,
      address: input.address,
      phone: input.phone,
    });
    if (!pharmacy) throw new NotFoundException(PHARMACY_NOT_FOUND);

    return toProfileResponse(pharmacy, 'ACTIVE');
  }
}
