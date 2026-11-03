import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SubscriptionStatus } from '@smartshelf/contracts';

export const SUBSCRIPTION_STATUS = Symbol('SUBSCRIPTION_STATUS');

export interface SubscriptionStatusReader {
  getEffectiveStatus(pharmacyId: string): Promise<SubscriptionStatus>;
}

// TEMPORARY: replace when Mustafa/Shiam merge.
// Shiam owns the effective-status rule. Until it is merged the status is unknown,
// so this refuses instead of reporting a status that could allow a write or listing.
@Injectable()
export class TemporarySubscriptionStatusAdapter implements SubscriptionStatusReader {
  getEffectiveStatus(): Promise<SubscriptionStatus> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Subscription status is not available yet',
      ),
    );
  }
}
