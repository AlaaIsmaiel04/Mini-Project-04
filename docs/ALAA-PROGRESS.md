# Current integration update - 7 November 2026

This update supersedes the dependency statements and test counts in the historical notes below. Mustafa's schema/authentication/inventory foundation and Mohammad's dashboard/profile/duty implementation are integrated. Hamid's latest work and the public PostgreSQL runner fix are merged through PR #18 (`50e1a79`).

- Dashboard reads persisted own-pharmacy stock, all seven metrics and attention badges; it refreshes on focus, navigation and inventory changes.
- Profile and duty screens use live JWT/Prisma APIs, inactive reads and restricted writes. Duty writes use a PostgreSQL row lock across API instances.
- Public search now reads real stock. ACTIVE subscriptions, positive/nonexpired matching batches, combined filters, deduplication, literal query characters and exact public fields are covered by database tests. The real search and directory browser flows work.
- Hamid's Light/Dark/System implementation is connected in public and workspace headers. It applies the saved/system theme before paint, follows live device preference changes and preserves drafts/authentication. Both themes support EN/AR and RTL.
- Typecheck/build pass; 485 API unit tests and 23 frontend tests pass. All 36 separate PostgreSQL acceptance tests pass. Current theme evidence and screenshots are in `output/theme/browser-checks.json`; owner forms use development previews, while search/directory and pharmacist reads use an isolated real database.
- Shiam's owner administration/subscription endpoints, full onboarding-to-public acceptance, another member's laptop setup and the actual six-member rehearsal remain pending. Days 8-14 are not all complete merely because the frontend exists.

Yousef's public frontend is implemented at Alaa's request and connected to persisted search/directory. Its stock-adapter and theme dependencies are resolved; Yousef still needs to understand the delivered code and participate in the English presentation. See [Yousef progress](YOUSEF-PROGRESS.md).

Day 10 is complete; see [Day 10 verification](DAY-10-VERIFICATION.md). Days 8-9 still await Shiam's owner APIs. See [Mohammad implementation](MOHAMMAD-IMPLEMENTATION.md) for the pharmacist workflows.

The records below describe earlier checkpoints; pending-adapter/theme statements and older test counts are historical, not current blockers.

---

# Historical implementation and integration checkpoints

Updated 4 November 2026. Scope: the current local `alaa` checkout. The existing shell, sign-in, owner and inventory screens now use the saved Figma design, adapted to English. See `DESIGN.md` for reusable styling and scope. Real backend integration remains pending.

| Day   | Current status                                                                                                                                                                        | Remaining evidence or dependency                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Approved contract/route/database-needs baseline exists                                                                                                                                | Team coordination remains ongoing                                                                                                            |
| 2     | Shell, routes, sign-in/logout and role redirects implemented; focus-based session validation and expiry feedback checked with simulated responses                                     | Real JWT/API verification; the one-minute validation timer is implemented but was not separately exercised in the latest browser run         |
| 3â€“4 | Owner list, filters, pharmacy/account creation and subscription forms implemented                                                                                                     | Shiam's endpoints, real persistence and backend enforcement                                                                                  |
| 5     | Inventory search, indicators, batches, counts and read-only explanation implemented                                                                                                   | Mustafa's real inventory response and authorization                                                                                          |
| 6     | Medicine and batch add/edit forms, request adapters and refresh behavior implemented and checked in the browser                                                                       | Frontend browser checks pass with development fixtures; real API acceptance remains pending                                                  |
| 7     | Hamid's profile, duty and public work merged through PRs #9 and #10; combined checks passed                                                                                           | Review remaining teammate PRs and confirm each member's contributions                                                                        |
| 8â€“9 | Request handling for owner/inventory/login is implemented, including session expiry and server validation messages                                                                    | Real owner/account/stock/subscription flows require the missing backend modules and database                                                 |
| 10    | Complete: shared inventory invalidation and dashboard navigation/focus refresh verified against real persisted writes; seven metrics, simultaneous badges and empty inventory checked | See [Day 10 verification](DAY-10-VERIFICATION.md); no remaining Day 10 dependency                                                            |
| 11    | Alaa took over Day 11 language foundation; shared EN/AR, persistence and RTL implemented                                                                                              | EN/AR shared controls and RTL verified; Owner/inventory translations verified; dark theme and real public/profile integration remain pending |
| 12    | Frontend request/validation tests added; build verification available                                                                                                                 | Real CORE acceptance, persistence checks and startup on another member's laptop remain pending                                               |
| 13    | English demo script prepared in `DEMO-REHEARSAL.md`                                                                                                                                   | Working full flow, tested merges and actual team rehearsal                                                                                   |
| 14    | Current setup and limitations documented                                                                                                                                              | Final data/time verification and all six members' understanding/presentation                                                                 |

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
3. Mohammad: dashboard/profile/duty integration is merged through PR #8. Dashboard consumes `useInventoryRevision()`, fetches on navigation and focus, and displays server-calculated metrics. Day 10 real inventory writes and browser verification are complete; see `DAY-10-VERIFICATION.md`.
4. Hamid: profile, duty-period validation/overlap protection, public directory/search, Swagger and integration guides are merged through PR #10 (`69544ea`). Replace temporary authentication/persistence/subscription adapters with shared implementations when available. Alaa took over the Day 11 language foundation; dark theme and real database integration remain pending. Share component exports and shell requirements before editing shared files.
5. Yousef: share public search/directory components and route exports. Verify 390 px layout, keyboard navigation, labels, helpful empty state and phone links using real public data. Alaa integrates the existing `/` and `/pharmacies` routes when these exports exist.

No teammate-owned feature, migration, mock authentication or backend rule was implemented as a substitute for a missing dependency.

## Verification limits

After Hamid's merge, `npm test` passes 418 API tests and five frontend request/validation tests. API tests use test actors and stores; the running profile endpoints still reject authentication through a temporary guard. Passing these tests or a fixture preview does not prove real JWT, PostgreSQL persistence or CORE integration.

On 4 November 2026, the Day 6 inventory forms were checked in the browser with the in-memory development service. Checks cover all four forms, required/whitespace/fractional input, duplicate conflicts, draft preservation, save/cancel, pending controls, 400/403/404/network rejections, refresh failure/retry, retained filters, inactive subscriptions, 390 px layouts and keyboard navigation. Evidence is in `output/day6/browser-checks.json` and the two PNGs beside it. These checks supersede the earlier browser approval timeouts for Day 6.

The combined checkout was checked again after merging Hamid's work. Owner/account/subscription flows, inventory filters and all four stock forms passed browser checks. Session checks verified protected-route notices, focus-triggered `/auth/me` requests, transient network errors, 401 expiry feedback, refreshed role navigation and logout with simulated responses. The API started successfully, served Swagger, and registered profile GET/PATCH routes that returned the expected 401 through the temporary authentication guard. The one-minute session timer and real backend integration remain separate verification items.

Fixed the permanent “refreshing” success copy, distinguished temporary access verification from an inactive subscription, and restored focus during layout commit so a delayed callback cannot interfere with the next action.

The combined checkout passes typecheck, the production build, 418 API tests, five frontend request/validation tests, and foundation smoke checks. Real PostgreSQL integration and backend authorization remain unverified. Repository-wide formatting has existing failures outside this change.

Before marking Days 8â€“14 complete, run `docs/ACCEPTANCE.md` against the real PostgreSQL data, attach actual results, run the latest browser checks, and complete the team rehearsal. Do not mark future days complete merely because their checklist or demo script is prepared.

## Figma styling adaptation

The saved exports were used with Alaa's explicit approval after the live connector hit its rate limit. Existing English text and functionality were retained. New shared navigation, local Cairo fonts, cream/green/gold tokens, desktop list columns, mobile cards and owner/inventory/sign-in form styling are implemented. No teammate-owned feature or mock production authentication was added.

Responsive checks cover five routes at 320, 390, 768, 1280 and 1440 pixels, local font loading, no horizontal overflow, mobile menu/Escape/focus, skip navigation, medicine forms and owner management forms. Owner Days 3-4, inventory Days 5-6 and session browser regressions pass with preview fixtures/simulated responses. Public data, real sign-in and persisted workflows still depend on backend integration; these styling checks do not mark future integration days complete.

## Day 11 language foundation (taken over from Hamid)

Added typed English/Arabic shared messages, LanguageProvider, persistent accessible language control, startup/document lang and direction, mirrored sidebar and isolated LTR data. Shared shell, sign-in/session text and route placeholders are translated. Owner/inventory labels, forms and feedback now translate; see `LANGUAGE.md` for the scope and Day 12 handoff. Dark mode remains separate.

Build and eight frontend tests pass. Browser checks cover reload persistence, blocked localStorage, translated sign-in failure, preserved unsaved login/inventory fields, RTL desktop/mobile layouts, menu/Escape/focus, and skip link. Existing owner, inventory and session regression checks pass after integration. These are fixture/simulated-response checks and do not replace real backend acceptance. Publishing to the shared repository is a separate step after local verification.

## Owner/inventory Arabic expansion — 5 November 2026

Translated all existing interface text in owner and inventory feature components, including form labels, status options, result counts, help text, deletion confirmation, local validation and preview controls. Error/success text re-renders in the selected language without clearing drafts or changing request payloads. Names, categories, addresses and stock data remain as entered. Unknown backend text remains visible unchanged. Added safe parameter interpolation and a regression test for mixed-language values; enum option values stay independent of translated labels.

Arabic workflow and responsive checks passed at 320/390/768/1280/1440px. Existing English owner/account/subscription, inventory and session browser checks pass. This work is delivered alongside the Figma and language-foundation changes.
