# Day 12 acceptance report

Checked on 7 November 2026, on `alaa`, starting from merged commit `2a86c2e`.

**Outcome: the acceptance work that can run independently is complete. Full Day 12 remains open.** Implemented authentication, inventory, dashboard, profile/duty and public APIs passed their automated acceptance checks. Owner administration still needs Shiam's backend. Another member's laptop setup and the actual team acceptance session have not been performed.

## Scope and evidence

- Typecheck and production build passed. `npm test`: 485 API unit tests and 23 frontend tests passed; three database groups are intentionally skipped by this command.
- `npm run test:integration`: all 36 tests passed, zero failures/skips, against a newly created, isolated PostgreSQL test database. The runner applied the migration to the empty database before testing.
- The demo seed ran twice afterward. Counts stayed at 5 accounts, 4 pharmacies, 16 medicines, 24 batches and 1 duty period. Repeating the seed did not duplicate records.
- Expanded `npm run smoke` passed: API health, built frontend, implemented auth/inventory/dashboard/profile/duty/public Swagger routes, unauthenticated private-route rejection, public directory, required search query and live medicine search.
- Six browser regression groups passed. Real pharmacist fixtures were created in the separate test database and cleaned up. Owner requests and deliberate loading/network/error scenarios used development services or controlled responses, as detailed below.
- A tracked-file audit checked for environment files, dependencies, build output, local databases, temporary files and private-key material. Its result is in `output/day12/repository-audit.json`.

Machine-readable evidence is in [automated-checks.json](../output/day12/automated-checks.json) and [verification.json](../output/day12/verification.json). Screenshots under `output/day12/public/` use controlled public responses; they are not evidence of real stock. The previous theme/persistence/contrast checks remain in [theme verification](../output/theme/verification.json).

This run used this Windows computer and its installed dependencies. A fresh database is not a clean install on another laptop. No development database was reset, no owner API was simulated as production functionality, and no teammate's presentation is marked complete.

## Acceptance matrix

PASS means the listed implemented scenario was verified. PARTIAL and BLOCKED remain open for final acceptance. The source checklist is [ACCEPTANCE.md](ACCEPTANCE.md).

| ID  | Status       | Evidence and remaining work                                                                                                                                                                                                                                                     |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | PASS         | Real HTTP checks reject missing/wrong/expired tokens, enforce roles and reload the account. Security-logging unit tests verify rejection logs exclude request bodies, passwords, tokens and email. Login intentionally returns its access token.                                |
| A02 | PASS         | Real inventory/duty checks reject guessed cross-pharmacy IDs and owner inventory access; no caller-supplied pharmacy scope is trusted.                                                                                                                                          |
| A03 | BLOCKED      | Owner pharmacy/account/subscription creation, duplicate email and missing-pharmacy validation require Shiam's endpoints. Owner UI mock/preview checks do not satisfy this criterion.                                                                                            |
| A04 | BLOCKED      | Effective status/date logic and future/suspended visibility are tested, but owner subscription creation, duplicate-subscription rejection and end/start validation cannot be accepted through an owner API yet.                                                                 |
| A05 | PASS         | Real inactive pharmacist reads work; all implemented inventory/profile/duty writes reject suspended, expired, future or missing subscriptions with the appropriate reason. Test setup changes database records directly, not through an owner screen.                           |
| A06 | BLOCKED      | Public lifecycle tests directly delete a subscription and verify hidden listings/continued profile reads. Deletion through Shiam's owner endpoint and preservation of all related records remain unverified.                                                                    |
| A07 | PASS         | Real 409 checks cover normalized per-pharmacy medicine uniqueness, separate pharmacy names and duplicate batch numbers.                                                                                                                                                         |
| A08 | PARTIAL      | Implemented APIs reject invalid quantities, costs, dates, UUIDs, query enums and extra fields; expired batches remain allowed. Owner/account/subscription validation needs Shiam.                                                                                               |
| A09 | PASS         | Fixed-clock calculation tests cover yesterday/today/+90/+91 and exclusion of expired units; persisted dashboard/inventory checks corroborate the results.                                                                                                                       |
| A10 | PASS         | Threshold equality, multiple indicators, filtered counts and the expired-batch HEALTHY exclusion pass unit/API checks. Real stock writes refresh the visible dashboard and badges.                                                                                              |
| A11 | PASS         | Persisted dashboard/browser checks verify nonexpired value `25.00`, expected waste `12.00` and available units `10` from the agreed example.                                                                                                                                    |
| A12 | PASS         | Real inventory tests check atomic timestamps, forced rollback and visibility from another connection.                                                                                                                                                                           |
| A13 | PASS         | Fixed-clock and PostgreSQL tests cover overnight duty, exact inclusive start/exclusive end, adjacent/edit-self periods, invalid duration and simultaneous overlap protection across API instances. Real UI add/edit/delete/overlap feedback also passed.                        |
| A14 | PASS         | Real PostgreSQL tests cover partial/scientific/case matching, combined area/duty filters, eligible stock, inactive/expired-only/zero-only exclusion, literal wildcard characters and deduplication. Public state tests additionally cover retry and stale-request cancellation. |
| A15 | PASS         | Real directory tests cover ACTIVE-only listing, current/next/null duty and exact nested public response fields. Public cards apply their frontend allowlist as a second boundary.                                                                                               |
| A16 | PARTIAL      | Implemented frontend loading/empty/error/validation/read-only/multi-badge/refresh flows passed. Owner forms passed with controlled responses, including duplicate/validation/pending/delete/retry states. Real owner-backed states remain blocked.                              |
| A17 | PARTIAL      | Fresh migration, repeat seed, real API restart persistence and Swagger checks pass for implemented routes on this computer. Owner endpoint documentation/acceptance and independent laptop startup remain open.                                                                 |
| A18 | PENDING TEAM | Every member must personally present in English and explain architecture, one rule, one rejection and one decision. Prepared scripts do not count as participation.                                                                                                             |

## Frontend state review

| Area                                | What was checked                                                                                                                                                                                                          | Evidence type                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in/session/navigation          | Protected-route notice, role redirects, bearer session validation, transient network failure, 401 expiry message, refreshed role navigation and logout                                                                    | Controlled auth/error responses; real sign-in/private reads also covered by API and pharmacist browser tests                             |
| Owner pharmacy/account/subscription | Account payload and password preservation, 409/400 feedback, pending controls, subscription create/update/toggle, delete cancel/error/204, failed refresh/retry and direct subscription route                             | Controlled API responses; Arabic workflows also use the explicit development preview                                                     |
| Inventory                           | All four forms, blank/fractional/duplicate rejection, historical/zero input, immutable batch fields, retained drafts, pending/disabled controls, failed refresh/retry, inactive restrictions, filters and keyboard cancel | Preview/error scenarios plus real PostgreSQL stock-to-dashboard browser writes                                                           |
| Dashboard                           | Exact metrics, simultaneous badges, empty/inactive data, focus/inventory refresh, loading/error/retry and 401 handling                                                                                                    | Real PostgreSQL data with selected delay/error responses injected                                                                        |
| Profile/duty                        | Required/invalid input, pending controls, draft preservation, persisted save, timezone conversion, add/edit/delete/cancel, overlap feedback, retry and inactive read-only state                                           | Real PostgreSQL data with selected delay/error responses injected                                                                        |
| Public search/directory             | Initial/empty/loading/error states, explicit submit, combined filters, phone link, counts, clear/reset, retry retaining filters, stale-response protection, null duty/timestamps and response allowlist                   | Real directory/empty-stock request; controlled response states; eligible-stock/rule combinations verified by PostgreSQL acceptance tests |
| EN/AR and accessibility             | RTL, preserved drafts/feedback on language switch, keyboard submission/focus and mobile layouts at 320/390/768/1280/1440 where supported by each regression                                                               | Headless Edge checks; not physical-device certification                                                                                  |

No new frontend defect was found in this run. The smoke script was extended because it previously omitted working dashboard/profile/duty/public routes. It remains read-only with respect to business records.

## What remains before Day 12 can close

1. Shiam delivers owner pharmacy/account/subscription endpoints and Swagger. Run A03/A04/A06, the owner portions of A08/A16/A17, and the full owner-onboarding-to-public flow using real requests.
2. With the real owner API, suspend/delete/reactivate a subscription; confirm pharmacist read-only behavior, public listing changes and preservation of stock/accounts/duty. Do not use direct database changes as the final owner workflow demonstration.
3. Another member follows [LOCAL-SETUP.md](LOCAL-SETUP.md) on their own laptop and records the results in [SECOND-LAPTOP-CHECK.md](SECOND-LAPTOP-CHECK.md).
4. The team runs the checklist together, reviews real JSON for privacy, and records who checked each result. Complete the actual English rehearsal separately for Days 13-14.

## How to repeat the available checks

Run `npm run typecheck`, `npm test`, `npm run build`, then `npm run smoke` with a working, dedicated demo database. Set `TEST_DATABASE_URL` to a separate `smartshelf_test` or `smartshelf_test_<suffix>` database before `npm run test:integration`. Preserve existing local configuration; never point test commands at a production or personal working database.

For manual frontend acceptance, follow the state-review table: save valid stock, reject invalid/conflicting input, retry a failed read, verify inactive read-only behavior, navigate to dashboard and public search, then repeat keyboard/mobile and EN/AR flows. Controlled failures demonstrate UI handling only; final owner acceptance must use real owner endpoints.
