# Public search and directory

Owner: Hamid. Citizens search for a medicine or browse pharmacies with no account. Answers contain public pharmacy fields only.

## Endpoints

All paths start with `/api`. No token is needed. Examples of every answer are in [INTEGRATION.md](INTEGRATION.md).

| Method and path         | Query                                     | Success                            | Errors   |
| ----------------------- | ----------------------------------------- | ---------------------------------- | -------- |
| `GET /public/pharmacies` | `area`, `onDutyNow` (both optional)       | 200 `ListResponse<PublicPharmacy>` | 400, 500 |
| `GET /public/medicines`  | `q` (required), `area`, `onDutyNow`       | 200 `ListResponse<PublicPharmacy>` | 400, 500 |

No match is not an error: the answer is 200 with `{ "items": [], "total": 0 }`. Each pharmacy appears once, sorted by name.

- `q` matches part of a display or scientific name, ignoring case. An empty `q` gets 400.
- `area` is an exact match, ignoring case and surrounding spaces. Blank means no filter.
- `onDutyNow` must be exactly `true` or `false`. `false` means no filter.
- `%`, `_` and `\` in `q` and `area` match literally. They are not wildcards.

## Rules enforced

| Rule | How |
| --- | --- |
| R-5, A15: `ACTIVE` subscriptions only | Every pharmacy is checked with the shared `effectiveSubscriptionStatus`. A deleted, future, expired or suspended subscription hides the pharmacy from both routes. The directory lists `ACTIVE` pharmacies even with no stock. |
| R-24, A14: eligible stock | A pharmacy appears in a search only if one batch of a matching medicine has a quantity above 0 and has not expired. A batch expiring today still counts. "Today" means the date in `BUSINESS_TIME_ZONE` (Asia/Amman). Expired-only and zero-only stock never count. |
| R-23: on duty now | The start instant is on duty and the end instant is not, so 20:00 to 08:00 includes 02:00 but not 08:00. `currentDuty` is the period running now, and `nextDuty` the earliest upcoming one. Either can be `null`. |
| R-25, A15: public fields only | `toPublicPharmacy` copies `name`, `area`, `address`, `phone`, `onDutyNow`, `currentDuty`, `nextDuty` and `inventoryUpdatedAt` by name, and only `startsAt` and `endsAt` inside each period. No IDs, quantities, medicine data, costs, storage, barcodes, users or subscription data. The stock query reads only quantity, expiry date and pharmacy ID. |

## Tests and demo

- Fixture specs need no database. `public.integration.spec.ts` runs the same routes through the real `AppModule` and PostgreSQL, with the real clock instance frozen for exact date and duty boundaries.
- [DEMO.md](DEMO.md) is the step-by-step demo in Swagger, and [PRESENTATION.md](PRESENTATION.md) the spoken notes.
- `demo-responses/` holds real answers saved from the rehearsal, with the sign-in token and password removed.
- `testing/duty-at.ts` answers "who is on duty at this moment?" from the real application with only its clock pinned. It is for testing and demos, and no module imports it.

## Known limitations

- **CI does not run `public.integration.spec.ts` yet.** `scripts/test-integration.mjs` uses a fixed list of files, so Alaa needs to add one line. It is in `NOTES-FOR-ALAA.md`.
- **One status query per pharmacy.** `keepActive` reads each pharmacy's status separately. This does not matter at demo size, but a large directory would want one joined query.
- **Stock is filtered in the service, not in SQL.** The search loads every batch of matching medicines, then applies the rule. A very short `q` on a large database would read many rows.
- **On duty is not opening hours.** The system only knows duty periods, so "not on duty" does not mean closed.
- **The seed has one `ACTIVE` pharmacy**, so the area filter has little to compare in a demo. It is in `NOTES-FOR-ALAA.md`.
- **A database outage answers 500**, with no detail. The API contract does not list this status yet.
