import type { SubscriptionStatus } from '@smartshelf/contracts';

// A Prisma Subscription row satisfies this interface. No Prisma query happens here.
export interface SubscriptionState {
  startDate: Date;
  endDate: Date;
  suspended: boolean;
}

export function effectiveSubscriptionStatus(
  subscription: SubscriptionState | null,
  today: string,
): SubscriptionStatus {
  if (!subscription) return 'NONE';
  if (subscription.suspended) return 'SUSPENDED';
  const start = subscription.startDate.toISOString().slice(0, 10);
  const end = subscription.endDate.toISOString().slice(0, 10);
  if (today > end) return 'EXPIRED';
  if (today < start) return 'NONE';
  return 'ACTIVE';
}
