# Owner frontend — Alaa

## Day 3

- `/owner`: owner-only pharmacy list, name search, subscription status filter,
  result count, and create-pharmacy form (name, area, address, phone).
- Search and status are applied together with **Search**. **Clear filters** resets both.
- Creation trims inputs, rejects blank/whitespace-only fields, disables the form
  while saving, retains values on failure, and refreshes the list on success.
  Successful creation clears filters so the new pharmacy can appear.
- Loading, empty, API-error/retry and success states are included. A 401 clears
  the session; API validation messages are shown. Backend authorization and
  validation remain the API's responsibility.

`owner-api.ts` uses the agreed GET/POST `/api/owner/pharmacies` contracts and
the current bearer token. It never substitutes sample data after a failed request.

## Local preview while APIs are unfinished

Run `npm run dev` and open `http://localhost:5173/dev/owner` (use the port printed
by Vite if different). This development-only route uses the same view with four
explicitly synthetic examples, covering every subscription status. It makes no
API requests, does not sign anyone in, and resets data on refresh or remount.
The preview module/route is excluded from production builds. `/owner` stays
protected and always uses real requests.

## Verification and remaining integration

Day 3 was checked with TypeScript, the production build, the foundation smoke
check, and headless desktop/mobile browser scenarios. Browser checks covered
filters, creation, blank inputs, loading/empty/error/retry states, bearer token
and request fields, 401 sign-out, anonymous route protection, and exclusion of
the preview from production. API responses in those browser checks were simulated.
The repository's `npm test` currently reports no API feature tests.

Real login and persisted pharmacy creation must still be verified when Mustafa's
authentication and Shiam's owner endpoints are available. Pharmacist account
creation and subscription editing remain Day 4 tasks.
