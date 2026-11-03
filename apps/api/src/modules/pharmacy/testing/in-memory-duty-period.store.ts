import { randomUUID } from 'node:crypto';
import type {
  DutyPeriodRecord,
  DutyPeriodStore,
  DutyTimes,
  DutyWriteResult,
} from '../stores/duty-period.store';

const byStart = (a: DutyTimes, b: DutyTimes) =>
  a.startsAt.getTime() - b.startsAt.getTime();

// Test only: never bind this in a module. Each write runs without yielding, which
// is not evidence of concurrency safety; that needs the real database.
export class InMemoryDutyPeriodStore implements DutyPeriodStore {
  private periods: DutyPeriodRecord[] = [];

  async listForPharmacy(pharmacyId: string): Promise<DutyPeriodRecord[]> {
    return this.periods
      .filter((period) => period.pharmacyId === pharmacyId)
      .sort(byStart)
      .map((period) => ({ ...period }));
  }

  async listEndingAfter(
    pharmacyIds: string[],
    at: Date,
  ): Promise<DutyPeriodRecord[]> {
    return this.periods
      .filter(
        (period) =>
          pharmacyIds.includes(period.pharmacyId) &&
          period.endsAt.getTime() > at.getTime(),
      )
      .sort(byStart)
      .map((period) => ({ ...period }));
  }

  async createIfNoOverlap(
    pharmacyId: string,
    { startsAt, endsAt }: DutyTimes,
  ): Promise<Exclude<DutyWriteResult, { status: 'not_found' }>> {
    if (this.overlaps(pharmacyId, { startsAt, endsAt })) {
      return { status: 'overlap' };
    }
    const period = { id: randomUUID(), pharmacyId, startsAt, endsAt };
    this.periods.push(period);
    return { status: 'saved', period: { ...period } };
  }

  async updateIfNoOverlap(
    pharmacyId: string,
    id: string,
    { startsAt, endsAt }: DutyTimes,
  ): Promise<DutyWriteResult> {
    const period = this.periods.find(
      (candidate) => candidate.id === id && candidate.pharmacyId === pharmacyId,
    );
    if (!period) return { status: 'not_found' };
    if (this.overlaps(pharmacyId, { startsAt, endsAt }, id)) {
      return { status: 'overlap' };
    }
    Object.assign(period, { startsAt, endsAt });
    return { status: 'saved', period: { ...period } };
  }

  async delete(pharmacyId: string, id: string): Promise<boolean> {
    const remaining = this.periods.filter(
      (period) => !(period.id === id && period.pharmacyId === pharmacyId),
    );
    const deleted = remaining.length < this.periods.length;
    this.periods = remaining;
    return deleted;
  }

  // Half-open intervals: a period may start at the exact end of another.
  private overlaps(
    pharmacyId: string,
    { startsAt, endsAt }: DutyTimes,
    ignoredId?: string,
  ): boolean {
    return this.periods.some(
      (period) =>
        period.pharmacyId === pharmacyId &&
        period.id !== ignoredId &&
        period.startsAt.getTime() < endsAt.getTime() &&
        startsAt.getTime() < period.endsAt.getTime(),
    );
  }
}
