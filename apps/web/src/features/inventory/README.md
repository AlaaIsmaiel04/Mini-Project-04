# Inventory frontend — Alaa

## Day 5

The protected `/pharmacist/inventory` page lists the signed-in pharmacist's
medicines using GET `/api/pharmacist/medicines` and the existing shared contracts.
The request uses a bearer token; it never supplies a pharmacy ID. Backend guards
remain responsible for authorization, ownership and subscription restrictions.

- Search display/scientific names and select one indicator, then **Search inventory**.
  Search and status combine; **Clear filters** resets both.
- Show visible medicine count, display/scientific name, category, available quantity,
  reorder threshold and every returned indicator (including simultaneous indicators).
- Expand **Batch details** with mouse or keyboard to see number, quantity, date-only
  expiry, storage, unit cost, optional barcode and batch expiry indicators.
- Empty medicine lists, unmatched filters and medicines without batches each have
  explicit messages. Null barcodes show **Not provided**; zero quantities stay visible.
- Loading, error/retry and inactive-subscription read-only explanations are included.
  Inactive users retain search and read access. A 401 clears the session.
- Requests are cancelled/ignored when filters change or the page unmounts, so an
  older response cannot replace newer results.

The real UI displays quantities, indicators and subscription status returned by the
API. It does not calculate business rules or add sample data on request failure.
Medicine and batch mutation forms are now implemented for Day 6. Writes require
a freshly loaded ACTIVE subscription and backend rejection is shown if access changes.

## Local preview

Run `npm run dev` and open `http://localhost:5173/dev/inventory` (use Vite's printed
port if different). This development-only route has five synthetic medicines with
fixed indicators for **3 November 2026**, covering all four indicators, combinations,
multiple batches, zero quantity, null barcodes and no batches. **Sample subscription**
lets you check ACTIVE, EXPIRED, SUSPENDED and NONE without signing anyone in or
making API requests. Refresh resets it. The route and fixture module are excluded
from production builds; the real inventory route remains protected.

## Verification

Typecheck, production build, foundation smoke checks, owner regressions and Day 5
headless browser checks were run. Inventory scenarios covered all filters/counts,
case/whitespace and scientific-name search, simultaneous indicators, batch details,
keyboard expansion, mobile width, inactive read access, loading/empty/error/retry,
404/403/network errors, 401 sign-out, request headers/query, stale response handling,
anonymous/wrong-role protection, and preview exclusion in production.

Browser API responses were simulated. Real JWT authentication, pharmacist isolation,
today's calculated inventory values and inactive-subscription behavior must still be
verified with Mustafa's API and persisted database records. After Hamid's Day 1-2
merge, `npm test` passes 108 API tests and five frontend request/validation tests.
The API tests use test actors/stores and do not verify real JWT or persistence.
Day 6 browser checks were completed with synthetic data on 4 November 2026; details follow.

## Day 6 and integration preparation

- Add/edit medicines and add/edit batches through the agreed POST/PATCH endpoints.
- Batch edit shows number/cost/barcode as read-only and sends only quantity,
  expiry and storage in PATCH, with a runtime allowlist in the adapter.
- Zero quantities and historical expiry dates are allowed. Blank fields, invalid
  calendar dates, negative values and fractional quantities are rejected locally;
  backend validation remains authoritative.
- Failed saves preserve the draft and show the server message. A 403 locks the
  current editor and refreshes subscription status; Cancel leaves the editor.
- Successful saves refetch the current filtered inventory. If the refresh fails,
  the success notice remains alongside the retryable read error. Filters remain
  applied, so an edited medicine can leave the current filtered list.
- `notifyInventoryChanged()` also notifies the integrated dashboard. Its fetch
  effect consumes `useInventoryRevision()` and refetches on navigation and focus.
- Window focus refreshes inventory/subscription status. API authorization remains
  mandatory for every write; frontend controls cannot prevent a race on the server.
- The development preview supports in-memory CRUD with a fixed demonstration date.
  Real routes always use API responses; no production calculation helper or fixture fallback was added.

## Day 6 verification — 4 November 2026

All four forms were exercised in the actual browser using the development service. Checks covered validation, duplicate medicine/batch conflicts, save/cancel, draft preservation, zero stock and historical expiry, read-only batch fields, filtered refresh, slow-save controls, failure/retry states, inactive subscriptions, 390 px layout and keyboard focus/navigation. The corrected focus return is performed during layout commit, and a completed save no longer claims a refresh is still running.

The preview now has a **Next save response** selector for one-shot simulated 400/403/404/network failures, a two-second save and a successful save followed by a failed read. These controls only exercise frontend behavior; they do not implement backend authorization or persistence and are excluded from production.

Evidence: `output/day6/browser-checks.json`, `desktop-batch-editor.png` and `mobile-medicine-form.png`. `npm test` passes all five request/validation tests; the final production build passes. Real persisted API flows and server-side rules still require Mustafa's backend. See `docs/ALAA-PROGRESS.md` for the dependency record. No commit or push was performed.

## Day 10 persisted dashboard integration - 6 November 2026

The refresh handoff is implemented and verified against the real JWT/Prisma APIs.
Real inventory form saves update dashboard totals and simultaneous attention
badges after navigation. Focus refresh also picks up a persisted edit from another
browser tab. Empty inventory returns seven zero metrics and helpful empty states.
Quantity, reorder-threshold and expiry edits were checked against exact API values;
React continues to display server calculations.

See `docs/DAY-10-VERIFICATION.md` and `output/day10/browser-checks.json` for results.
Earlier Day 5-6 verification sections above describe historical fixture checks;
Day 10 uses isolated PostgreSQL records and real requests. Owner administration
remains dependent on Shiam and is not covered by this completion.
