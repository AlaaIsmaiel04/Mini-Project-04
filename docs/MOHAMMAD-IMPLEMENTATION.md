# Mohammad integration and fixes - 5 November 2026

## Implemented

- Reconciled branch Mohammad with main while keeping the current authentication, schema, inventory, shell, CI and language foundations.
- Shared stock helper preserves Mustafa's existing callers and provides the agreed calculateMedicine wrapper and complete dashboard aggregation. Decimal money, Amman calendar boundaries, equality at reorder threshold and simultaneous indicators are covered.
- Real scoped dashboard endpoint and Swagger: pharmacy name, effective subscription, total medicines, available units/value, expiring batches, low medicines, expired batches, expired waste and attention list. Empty pharmacies return zeros; inactive subscriptions may read.
- Dashboard frontend uses real API responses, loading/empty/error/retry, focus/navigation refresh and Alaa's inventory mutation signal.
- Profile frontend updates only area/address/phone; pharmacy name stays read-only. Pending/validation/server errors preserve drafts; successful saves refresh data.
- Duty frontend supports current/upcoming/past list, add/edit/delete and confirmation. Device timezone is displayed. Local inputs become UTC ISO timestamps and round-trip correctly on edit. Overnight periods are allowed; reversed, overlapping and over-24-hour periods are rejected.
- Connected Hamid's profile/duty services to shared JWT/Prisma so these screens work with persisted data. Database pharmacy-row locking covers concurrent duty requests from different API instances. Subscription status is rechecked within writes.
- EN/AR, RTL and current design tokens cover all new pages. No production route substitutes sample data after API errors.

## Verification

Typecheck and production build pass. Ordinary npm test passes 435 API tests and 11 frontend tests, with database groups explicitly skipped unless enabled. npm run test:integration uses a separate smartshelf_test database and passes 15 PostgreSQL/HTTP tests, including the new dashboard/profile/duty group.

The real API browser check covers all seven metrics and attention badges, empty/inactive reads, inventory/focus refresh, loading/error/retry/401, profile validation/pending/draft preservation/persisted save, duty local-to-UTC conversion, overnight add/edit/delete/cancel, overlap error translation and read retry. English/Arabic layouts passed at 320/390/768/1440px without horizontal overflow or browser exceptions. Test fixtures and temporary servers are removed after checking.

## Integration limits

Owner administration and subscriptions still need Shiam's backend. Public medicine-stock persistence remains a separate adapter integration; public frontend and dark theme remain teammate scope. Full owner-to-public acceptance and six-member rehearsal are not signed off by this work. Demo seed accounts are documented in LOCAL-SETUP.md; environment files remain ignored.

This is local review evidence. No GitHub checks run until the reviewed changes are committed and pushed. The main merge into Mohammad and all fixes remain uncommitted at Alaa's request.
