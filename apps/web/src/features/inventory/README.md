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
Medicine and batch mutation forms belong to Day 6; Day 5 exposes no mutation actions.
Those forms must enable writes only after loading an ACTIVE subscription and must
also handle backend rejection of writes after a subscription changes.

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
verified with Mustafa's API and persisted database records. `npm test` currently
reports no API feature tests; the browser checks are separate local verification.
