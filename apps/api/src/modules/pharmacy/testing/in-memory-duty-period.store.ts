import { randomUUID } from 'node:crypto';
import type {
  DutyPeriodRecord,
  DutyPeriodStore,
  DutyTimes,
} from '../stores/duty-period.store';

const byStart = (a: DutyTimes, b: DutyTimes) =>
  a.startsAt.getTime() - b.startsAt.getTime();

// Test only: never bind this in a module. Like a database with no transaction, a read
// and a later write are separate steps. A read takes its snapshot and then waits for
// readLatency, so simultaneous callers can all read before any of them writes.
export class InMemoryDutyPeriodStore implements DutyPeriodStore {
  private periods: DutyPeriodRecord[] = [];

  constructor(
    private readonly readLatency: () => Promise<void> = () => Promise.resolve(),
    private readonly newId: () => string = randomUUID,
  ) {}

  listForPharmacy(pharmacyId: string): Promise<DutyPeriodRecord[]> {
    return this.read((period) => period.pharmacyId === pharmacyId);
  }

  listEndingAfter(
    pharmacyIds: string[],
    at: Date,
  ): Promise<DutyPeriodRecord[]> {
    return this.read(
      (period) =>
        pharmacyIds.includes(period.pharmacyId) &&
        period.endsAt.getTime() > at.getTime(),
    );
  }

  async findForPharmacy(
    pharmacyId: string,
    id: string,
  ): Promise<DutyPeriodRecord | null> {
    const [period] = await this.read(
      (candidate) => candidate.id === id && candidate.pharmacyId === pharmacyId,
    );
    return period ?? null;
  }

  async create(
    pharmacyId: string,
    { startsAt, endsAt }: DutyTimes,
  ): Promise<DutyPeriodRecord> {
    const period = { id: this.newId(), pharmacyId, startsAt, endsAt };
    this.periods.push(period);
    return { ...period };
  }

  async update(
    pharmacyId: string,
    id: string,
    { startsAt, endsAt }: DutyTimes,
  ): Promise<DutyPeriodRecord> {
    const period = this.periods.find(
      (candidate) => candidate.id === id && candidate.pharmacyId === pharmacyId,
    );
    if (!period) throw new Error(`No duty period ${id}`);
    Object.assign(period, { startsAt, endsAt });
    return { ...period };
  }

  async delete(pharmacyId: string, id: string): Promise<boolean> {
    const remaining = this.periods.filter(
      (period) => !(period.id === id && period.pharmacyId === pharmacyId),
    );
    const deleted = remaining.length < this.periods.length;
    this.periods = remaining;
    return deleted;
  }

  // Provides no isolation, so tests show what PharmacyLock alone protects.
  transaction<T>(work: (store: DutyPeriodStore) => Promise<T>): Promise<T> {
    return work(this);
  }

  private async read(
    matches: (period: DutyPeriodRecord) => boolean,
  ): Promise<DutyPeriodRecord[]> {
    const snapshot = this.periods
      .filter(matches)
      .sort(byStart)
      .map((period) => ({ ...period }));
    await this.readLatency();
    return snapshot;
  }
}
