# Alaa's implementation and integration status

Updated 4 November 2026. Scope: the current local `alaa` checkout. The Figma implementation is deferred until the functional work and team integration are ready.

| Day   | Current status                                                                                                                                    | Remaining evidence or dependency                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Approved contract/route/database-needs baseline exists                                                                                            | Team coordination remains ongoing                                                                                                    |
| 2     | Shell, routes, sign-in/logout and role redirects implemented; focus-based session validation and expiry feedback checked with simulated responses | Real JWT/API verification; the one-minute validation timer is implemented but was not separately exercised in the latest browser run |
| 3â€“4 | Owner list, filters, pharmacy/account creation and subscription forms implemented                                                                 | Shiam's endpoints, real persistence and backend enforcement                                                                          |
| 5     | Inventory search, indicators, batches, counts and read-only explanation implemented                                                               | Mustafa's real inventory response and authorization                                                                                  |
| 6     | Medicine and batch add/edit forms, request adapters and refresh behavior implemented and checked in the browser                                   | Frontend browser checks pass with development fixtures; real API acceptance remains pending                                          |
| 7     | Hamid's Day 1-2 work reviewed and merged through PR #9; combined checks passed                                                                    | Review remaining teammate PRs and confirm each member's contributions                                                                |
| 8â€“9 | Request handling for owner/inventory/login is implemented, including session expiry and server validation messages                                | Real owner/account/stock/subscription flows require the missing backend modules and database                                         |
| 10    | Inventory mutation notification and dashboard integration instructions prepared                                                                   | Mohammad must consume the refresh hook; verify real counts/totals together                                                           |
| 11    | Existing routes reserved for teammates                                                                                                            | Hamid's Preferences and Yousef's public pages are not present here; integration/mobile/keyboard review cannot be completed yet       |
| 12    | Frontend request/validation tests added; build verification available                                                                             | Real CORE acceptance, persistence checks and startup on another member's laptop remain pending                                       |
| 13    | English demo script prepared in `DEMO-REHEARSAL.md`                                                                                               | Working full flow, tested merges and actual team rehearsal                                                                           |
| 14    | Current setup and limitations documented                                                                                                          | Final data/time verification and all six members' understanding/presentation                                                         |

## What changed in this work

- Medicine creation/editing: display/scientific names, category and reorder threshold.
- Batch creation/editing: quantity, expiry and storage; number/cost/barcode are read-only on edit and excluded from PATCH at runtime.
- Historical expiry dates and zero stock are accepted; form values stay after failed saves. An inactive subscription disables changes; a server 403 preserves the rejection reason and triggers a fresh inventory read.
- Successful writes refetch inventory without reloading the page. A success notice remains if the subsequent read fails. Existing filters remain applied, so a changed medicine may leave the current result set.
- Development inventory preview now supports changes in memory, with a fixed 3 November 2026 date and no sign-in/database requests. Refresh resets all sample changes. Real routes never fall back to these fixtures.
- Stable sign-out/session-invalidating callbacks, stale-login cancellation, sign-in-required notice, and periodic/focus `/auth/me` checks. Tokens remain in memory; page reload signs out. A failed network check does not silently replace a session with sample data.
- Frontend tests cover batch PATCH privacy, creation endpoints, zero/historical input, invalid dates/numbers, server validation, 401/403/404 and network failures.

## Team handoffs

1. Mustafa: merge models/migrations/seed, `/auth/login`, `/auth/me`, guards, inventory endpoints and atomic timestamp changes. Verify invalid/expired tokens, cross-pharmacy requests and inactive writes.
2. Shiam: merge owner onboarding and subscriptions. Verify ACTIVE/EXPIRED/SUSPENDED/NONE, duplicates and subscription deletion retaining stock/accounts/duty.
3. Mohammad: subscribe to `useInventoryRevision()` from `apps/web/src/lib/inventory-updates.ts` and include the revision in the dashboard fetch effect. Fetch on navigation and window focus as well. Do not calculate production dashboard metrics in React. Export the dashboard/profile components for the existing routes.
4. Hamid: Day 1-2 profile logic, DTOs, fixtures, public mapper and 108 API tests are merged through PR #9 (`9d406f9`). Replace temporary authentication/persistence/subscription adapters with the shared implementations when available. Duty/public endpoints, Day 7 Swagger improvements and later Preferences work remain pending. Share component exports and shell integration requirements before editing shared files.
5. Yousef: share public search/directory components and route exports. Verify 390 px layout, keyboard navigation, labels, helpful empty state and phone links using real public data. Alaa integrates the existing `/` and `/pharmacies` routes when these exports exist.

No teammate-owned feature, migration, mock authentication or backend rule was implemented as a substitute for a missing dependency.

## Verification limits

After Hamid's merge, `npm test` passes 108 API tests and five frontend request/validation tests. API tests use test actors and stores; the running profile endpoints still reject authentication through a temporary guard. Passing these tests or a fixture preview does not prove real JWT, PostgreSQL persistence or CORE integration.

On 4 November 2026, the Day 6 inventory forms were checked in the browser with the in-memory development service. Checks cover all four forms, required/whitespace/fractional input, duplicate conflicts, draft preservation, save/cancel, pending controls, 400/403/404/network rejections, refresh failure/retry, retained filters, inactive subscriptions, 390 px layouts and keyboard navigation. Evidence is in `output/day6/browser-checks.json` and the two PNGs beside it. These checks supersede the earlier browser approval timeouts for Day 6.

The combined checkout was checked again after merging Hamid's work. Owner/account/subscription flows, inventory filters and all four stock forms passed browser checks. Session checks verified protected-route notices, focus-triggered `/auth/me` requests, transient network errors, 401 expiry feedback, refreshed role navigation and logout with simulated responses. The API started successfully, served Swagger, and registered profile GET/PATCH routes that returned the expected 401 through the temporary authentication guard. The one-minute session timer and real backend integration remain separate verification items.

Fixed the permanent “refreshing” success copy, distinguished temporary access verification from an inactive subscription, and restored focus during layout commit so a delayed callback cannot interfere with the next action.

The combined checkout passes typecheck, the production build, 108 API tests, five frontend request/validation tests, and foundation smoke checks. Real PostgreSQL integration and backend authorization remain unverified. Repository-wide formatting has existing failures outside this change.

Before marking Days 8â€“14 complete, run `docs/ACCEPTANCE.md` against the real PostgreSQL data, attach actual results, run the latest browser checks, and complete the team rehearsal. Do not mark future days complete merely because their checklist or demo script is prepared.
