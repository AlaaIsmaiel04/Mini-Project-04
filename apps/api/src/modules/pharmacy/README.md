# Profile and duty API

Owner: Hamid. A pharmacist reads and updates their pharmacy's profile and manages its duty periods. The pharmacy always comes from the signed-in account, never from the request.

## Endpoints

All paths start with `/api` and need a pharmacist's bearer token. The exact JSON for every answer, with examples, is in [INTEGRATION.md](INTEGRATION.md).

| Method and path                       | Who can use it                | Input                  | Success                          | Errors                       |
| ------------------------------------- | ----------------------------- | ---------------------- | -------------------------------- | ---------------------------- |
| `GET /pharmacist/profile`             | Any status can read           | none                   | 200 `ProfileResponse`            | 401, 403, 404, 500           |
| `PATCH /pharmacist/profile`           | `ACTIVE` subscription         | `area, address, phone` | 200 `ProfileResponse`            | 400, 401, 403, 404, 500      |
| `GET /pharmacist/duty-periods`        | Any status can read           | none                   | 200 `ListResponse<DutyPeriod>`   | 401, 403, 500                |
| `POST /pharmacist/duty-periods`       | `ACTIVE` subscription         | `startsAt, endsAt`     | 201 `DutyPeriod`                 | 400, 401, 403, 409, 500      |
| `PATCH /pharmacist/duty-periods/:id`  | `ACTIVE` subscription         | `startsAt, endsAt`     | 200 `DutyPeriod`                 | 400, 401, 403, 404, 409, 500 |
| `DELETE /pharmacist/duty-periods/:id` | `ACTIVE` subscription         | none                   | 204 with no body                 | 400, 401, 403, 404, 500      |

`PATCH` needs all fields on both routes. It is not a partial update.

## Rules enforced

| Rule | How |
| --- | --- |
| R-1, A02: own pharmacy only | Every query is limited to the pharmacy of the signed-in account. A guessed ID of another pharmacy gets the same 404 as an unknown one, and the attempt is logged. |
| R-6, A05: inactive pharmacies can read but not change | Reads always work. Every write gets 403 with the reason, for `EXPIRED`, `SUSPENDED` and `NONE`. Status comes from the shared `effectiveSubscriptionStatus`. |
| Profile fields | Only `area`, `address` and `phone` can change. `name`, `pharmacyId` and unknown fields get 400. Values are trimmed. |
| R-21: valid duty times | Times need an offset or `Z`. The end must be after the start, and a period may last at most 24 hours. Answers are in UTC. |
| R-22, A13: no overlaps | Periods are half-open, `[startsAt, endsAt)`. They overlap when `newStart < existingEnd && newEnd > existingStart`, which gives 409. A period may start exactly when another ends, and may cross midnight. An edited period is not compared with itself, and other pharmacies are never compared. |
| A13: simultaneous requests | See below. |
| No private fields | Response mappers copy each field by name, so extra database columns or relations cannot leak. Error bodies have only `statusCode`, `message` and sometimes `error`. |

JWT checks come from Mustafa's `JwtAuthGuard`. `JwtPharmacistGuard` adds the pharmacist-only rule and never accepts an actor or header from the caller.

## Overlap and concurrency

Every duty write runs through `DutyPeriodStore.transaction`. `PrismaDutyPeriodStore` locks the pharmacy's row with `SELECT ... FOR UPDATE` before reading overlaps, then does all its reads and writes on that transaction. This makes writers of one pharmacy wait for each other, across separate API processes too. `PharmacyLock` also queues requests inside one process. Profile writes take the same row lock and re-check the subscription inside the transaction.

## Tests

Fixture specs need no database. Real PostgreSQL evidence is in `dashboard-pharmacy.integration.spec.ts`, which races writes across two API instances, and `../public/public.integration.spec.ts`. The 401, owner 403 and 500 examples in `INTEGRATION.md` come from the real JWT guard and Prisma stores; the other examples use fixed test data to show the wire shapes.

## Known limitations

- **No overlap constraint in the database.** The row lock protects every write that goes through `DutyPeriodStore.transaction`. A script writing directly to the table is not protected.
- **Heavy contention is not handled specially.** A lock wait past Prisma's 5-second transaction limit would answer 500. 80 simultaneous requests across two processes did not reach this.
- **Writes check the subscription against the real date.** The transaction uses `businessDate()`, not the injectable clock, so a frozen clock in a test does not affect writes.
- **No index on `(pharmacyId, endsAt)`**, which the overlap check filters on. This does not matter at demo size. It is in `NOTES-FOR-ALAA.md`.
- **A database outage answers 500**, with no detail. The API contract does not list this status yet.
- **Subscription deletion is tested by changing rows directly**, because Shiam's owner endpoints do not exist yet.
