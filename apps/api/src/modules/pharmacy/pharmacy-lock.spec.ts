import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PharmacyLock } from './pharmacy-lock';

const PHARMACY_A = '11111111-1111-4111-8111-111111111111';
const PHARMACY_B = '22222222-2222-4222-8222-222222222222';

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('PharmacyLock', () => {
  it('returns the result of the work', async () => {
    const result = await new PharmacyLock().runExclusive(
      PHARMACY_A,
      async () => 'done',
    );

    assert.equal(result, 'done');
  });

  it('runs work of one pharmacy one at a time, in arrival order', async () => {
    const lock = new PharmacyLock();
    const finished: number[] = [];
    let running = 0;
    let mostRunning = 0;

    await Promise.all(
      [1, 2, 3, 4, 5].map((turn) =>
        lock.runExclusive(PHARMACY_A, async () => {
          running++;
          mostRunning = Math.max(mostRunning, running);
          await nextTurn();
          finished.push(turn);
          running--;
        }),
      ),
    );

    assert.equal(mostRunning, 1);
    assert.deepEqual(finished, [1, 2, 3, 4, 5]);
  });

  it('does not make another pharmacy wait', async () => {
    const lock = new PharmacyLock();
    let releaseA = () => {};
    const heldByA = lock.runExclusive(
      PHARMACY_A,
      () =>
        new Promise<void>((resolve) => {
          releaseA = resolve;
        }),
    );

    // B finishes while A still holds its own lock.
    const result = await lock.runExclusive(
      PHARMACY_B,
      async () => 'B finished',
    );
    releaseA();
    await heldByA;

    assert.equal(result, 'B finished');
  });

  it('gives a failure only to its caller and lets the next work run', async () => {
    const lock = new PharmacyLock();

    const failing = lock.runExclusive(PHARMACY_A, async () => {
      throw new Error('store failed');
    });
    const next = lock.runExclusive(PHARMACY_A, async () => 'still runs');

    await assert.rejects(failing, /store failed/);
    assert.equal(await next, 'still runs');
  });

  it('keeps nothing once all work has finished', async () => {
    const lock = new PharmacyLock();

    await Promise.allSettled([
      lock.runExclusive(PHARMACY_A, nextTurn),
      lock.runExclusive(PHARMACY_A, () => Promise.reject(new Error('failed'))),
      lock.runExclusive(PHARMACY_B, nextTurn),
    ]);

    assert.equal(Reflect.get(lock, 'tails').size, 0);
  });
});
