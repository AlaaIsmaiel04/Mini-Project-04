import { Injectable } from '@nestjs/common';

/**
 * Runs work for one pharmacy at a time, in arrival order. Different pharmacies never
 * wait for each other. This only covers this API process; see README.md for the
 * database transaction that also covers other processes.
 */
@Injectable()
export class PharmacyLock {
  // The promise that resolves when the last queued work of each pharmacy has finished.
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(
    pharmacyId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const previous = this.tails.get(pharmacyId) ?? Promise.resolve();
    let release!: () => void;
    const finished = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => finished);
    this.tails.set(pharmacyId, tail);

    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.tails.get(pharmacyId) === tail) this.tails.delete(pharmacyId);
    }
  }
}
