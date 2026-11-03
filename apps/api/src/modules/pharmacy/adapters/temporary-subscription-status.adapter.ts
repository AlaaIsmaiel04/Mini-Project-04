import {
  ForbiddenException,
  Injectable,
  type Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SubscriptionStatus } from '@smartshelf/contracts';

export const SUBSCRIPTION_STATUS = Symbol('SUBSCRIPTION_STATUS');

export interface SubscriptionStatusReader {
  getEffectiveStatus(pharmacyId: string): Promise<SubscriptionStatus>;
}

// R-6: the reason returned when an inactive pharmacy attempts a change.
// TEMPORARY: replace when Mustafa/Shiam merge. Mustafa owns the subscription-write guard.
const INACTIVE_SUBSCRIPTION_REASONS: Record<
  Exclude<SubscriptionStatus, 'ACTIVE'>,
  string
> = {
  EXPIRED:
    'Your subscription has expired. Changes are not allowed until it is renewed.',
  SUSPENDED:
    'Your subscription is suspended. Changes are not allowed until it is reactivated.',
  NONE: 'Your pharmacy has no active subscription. Changes are not allowed.',
};

export async function assertSubscriptionActive(
  subscriptions: SubscriptionStatusReader,
  pharmacyId: string,
  logger: Logger,
): Promise<void> {
  const status = await subscriptions.getEffectiveStatus(pharmacyId);
  if (status === 'ACTIVE') return;

  logger.warn(
    `Change rejected for pharmacy ${pharmacyId}: subscription is ${status}`,
  );
  throw new ForbiddenException(INACTIVE_SUBSCRIPTION_REASONS[status]);
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
