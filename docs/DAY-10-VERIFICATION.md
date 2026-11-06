# Alaa Day 10 - inventory and dashboard integration

Checked on 6 November 2026, on `alaa` after integrating main (`00d01af`).

## Result

Day 10 is complete. Mohammad's merged dashboard already consumes the shared
inventory revision and refreshes on navigation and window focus. Successful
inventory mutations publish that revision. No production implementation changes
were required for this task.

Added a persisted HTTP acceptance scenario in
`apps/api/src/dashboard-pharmacy.integration.spec.ts` to verify that medicine and
batch writes update inventory responses and dashboard totals together. Browser
checks also exercised the actual forms against JWT authentication and PostgreSQL;
API responses were not mocked. Temporary records were removed afterward.

## Checked scenarios

| Inventory change                                                                                                            | Expected dashboard result                                                                                                      | Result |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Empty pharmacy                                                                                                              | Seven zero metrics; empty inventory and attention messages                                                                     | Passed |
| Create medicine with reorder threshold 10; add 10 units costing 2.50, expiring in 30 days; add 3 expired units costing 4.00 | 1 medicine, 10 non-expired units, value 25.00, expected waste 12.00; one low-stock medicine, one soon batch, one expired batch | Passed |
| Same medicine has low stock, expired and soon batches                                                                       | All three attention badges appear together                                                                                     | Passed |
| Change usable batch to 11 units and expiry in 91 days                                                                       | Value 27.50; low-stock and soon counts become zero; expired warning remains                                                    | Passed |
| Set expired batch quantity to zero                                                                                          | Expected waste 0.00; medicine HEALTHY and absent from attention; expired batch count remains one                               | Passed |
| Set threshold to 11 and usable expiry to 30 days                                                                            | Equality counts as low stock; low-stock and soon badges coexist; inventory soon filter returns one medicine                    | Passed |
| Change usable quantity to 12 in another browser tab, then focus dashboard                                                   | Persisted value refreshes to 30.00 and low-stock count becomes zero                                                            | Passed |
| Switch dashboard to Arabic at 390 px                                                                                        | Translated heading, no horizontal overflow or browser exceptions                                                               | Passed |

All displayed business values come from the API. The HTTP test includes a second
existing medicine, so its total/low-stock counts deliberately differ from the
single-medicine browser fixture. Dates use the configured Asia/Amman rules.

## Repeating the checks

Run the persisted tests with the repository's integration runner against a
dedicated test database, following `LOCAL-SETUP.md`:

```bash
npm run test:integration
```

The two persisted suites passed with **16 tests**, using the existing generated
Prisma client and an already migrated isolated test database. Initial client
regeneration was blocked by a Windows DLL lock from a running API; compiling and
running the suites directly against the unchanged generated client succeeded.
Stop API processes before regenerating Prisma on Windows.

For a manual UI check, sign in as an active pharmacist with an empty test pharmacy,
open Inventory, perform the mutations in the table, and navigate to Dashboard
after each save. Repeat the final quantity edit in another signed-in tab and
return focus to the dashboard. Use test records rather than changing real stock.

Browser evidence: [browser-checks.json](../output/day10/browser-checks.json).

Final project checks passed: `npm run typecheck`, `npm test` (435 API tests and
11 frontend tests; two database suites intentionally skipped by the ordinary test
runner and run separately above), `npm run build`, and `npm run smoke`.

## Scope

This verifies Day 10. Real owner/account/subscription administration still awaits
Shiam's backend for Days 8-9. Public stock persistence, remaining public frontend,
dark mode, complete acceptance and team rehearsal are separate work.

No commit or push was performed as part of Day 10.
