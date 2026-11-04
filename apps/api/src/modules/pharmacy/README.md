# Module ownership

Hamid: own profile and duty APIs.

The module declaration is empty NestJS boilerplate only. Create the controllers,
services, DTOs, response mapping, tests and Swagger documentation yourself.
Authentication guards, Prisma access and business helpers are also team tasks;
none are supplied. Coordinate their signatures early using docs/TEAM-PLAN.md.

## Duty period overlaps and concurrency

**The rule (R-22, A13).** Duty periods are half-open intervals `[startsAt, endsAt)`.
A new period overlaps an existing one when
`newStart < existingEnd && newEnd > existingStart` (`duty-overlap.ts`). So a period
may start at the exact instant another ends, an edited period is not compared with
itself, and periods of other pharmacies are never compared. `DutyPeriodService`
answers an overlap with 409.

**Why it needs protecting.** The check and the write are separate steps. Without
protection, two simultaneous requests can both read "no overlap" and both save.
`duty-overlap.spec.ts` keeps a control test that shows this happening.

**Now: `PharmacyLock`.** Every duty write of a pharmacy waits its turn in a queue, and
pharmacies do not wait for each other. This is enough while one API process runs,
but it does not protect two processes, and nothing outlives a restart.

**Plan when Mustafa's Prisma schema merges.** Implement `DutyPeriodStore.transaction`
with a serializable transaction, so PostgreSQL also protects the check and the write
across processes. If two transactions conflict, PostgreSQL aborts one and Prisma
reports `P2034`. The whole check then runs again, sees the committed period and
answers 409.

```ts
async transaction<T>(work: (store: DutyPeriodStore) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await this.prisma.$transaction(
        (tx) => work(new PrismaDutyPeriodStore(tx)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const isWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034';
      if (!isWriteConflict) throw error;
      if (attempt === 3) {
        throw new ConflictException(
          'Duty periods were changed at the same time. Please try again.',
        );
      }
    }
  }
}
```

- `PrismaDutyPeriodStore` must use the `tx` client it is given for every query.
  Serializable protection only holds if every duty write goes through `transaction`,
  which `DutyPeriodService` already does.
- Keep `PharmacyLock`. It stops requests in one process from aborting each other and
  retrying.
- Ask Mustafa for `startsAt`/`endsAt` as `@db.Timestamptz` and an index on
  `(pharmacyId, endsAt)`, which the overlap check filters on.
- A13 is not signed off until the simultaneous-request test also passes against real
  PostgreSQL. The in-memory store cannot prove the transaction works.
