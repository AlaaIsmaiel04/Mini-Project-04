import type { SubscriptionStatus } from '@smartshelf/contracts';
import { businessDate, parseCalendarDate } from '../../../common/business-date';
import {
  effectiveSubscriptionStatus,
  type SubscriptionState,
} from '../../../common/subscription-status';
import type { SubscriptionStatusReader } from '../adapters/subscription-status-reader';
import type { Clock } from '../clock';

export interface StoredSubscription {
  // Calendar dates, YYYY-MM-DD.
  startDate: string;
  endDate: string;
  suspended: boolean;
}

// Test only: never bind this in a module. Subscriptions are kept in memory, but their
// status comes from the real effective-status helper (R-3).
export class InMemorySubscriptions implements SubscriptionStatusReader {
  private readonly subscriptions = new Map<string, SubscriptionState>();

  constructor(private readonly clock: Clock) {}

  save(
    pharmacyId: string,
    { startDate, endDate, suspended }: StoredSubscription,
  ): void {
    this.subscriptions.set(pharmacyId, {
      startDate: parseCalendarDate(startDate),
      endDate: parseCalendarDate(endDate),
      suspended,
    });
  }

  delete(pharmacyId: string): void {
    this.subscriptions.delete(pharmacyId);
  }

  async getEffectiveStatus(pharmacyId: string): Promise<SubscriptionStatus> {
    return effectiveSubscriptionStatus(
      this.subscriptions.get(pharmacyId) ?? null,
      businessDate(this.clock.now()),
    );
  }
}
