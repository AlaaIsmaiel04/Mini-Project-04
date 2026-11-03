import type { SubscriptionStatus } from '@smartshelf/contracts';
import type { SubscriptionStatusReader } from '../adapters/temporary-subscription-status.adapter';

// Test only: never bind this in a module.
export class InMemorySubscriptionStatus implements SubscriptionStatusReader {
  private readonly statuses = new Map<string, SubscriptionStatus>();

  set(pharmacyId: string, status: SubscriptionStatus): void {
    this.statuses.set(pharmacyId, status);
  }

  async getEffectiveStatus(pharmacyId: string): Promise<SubscriptionStatus> {
    return this.statuses.get(pharmacyId) ?? 'NONE';
  }
}
