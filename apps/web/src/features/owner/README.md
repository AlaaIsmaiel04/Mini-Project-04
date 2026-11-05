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
authentication and Shiam's owner endpoints are available.

## Day 4

Choose **Manage pharmacy** on a card to open management for that pharmacy. The
existing protected `/owner/pharmacies/:pharmacyId/subscription` URL also opens
these forms directly. Details use the existing owner list contract; no new backend
endpoint or shared wire type is needed.

- Create a pharmacist with email and an initial password. The selected pharmacy
  ID is sent with the request; email is trimmed/lowercased. The password is sent
  unchanged and cleared after every request. Hashing, account uniqueness and
  password rules remain backend responsibilities.
- Create or edit subscription dates and suspension. End must be strictly after
  start, as required by R-4. Date-only strings are sent without timezone conversion.
- Quick **Suspend/Reactivate subscription** uses saved dates and only changes
  suspension. Reactivation does not guarantee ACTIVE status if dates are expired
  or in the future. Save the form to apply edited dates.
- **Delete subscription** asks for confirmation explaining what is retained.
  Cancel sends no request. DELETE targets only the subscription endpoint and
  accepts 204 without trying to parse JSON.
- After a successful subscription change, details and the pharmacy list refresh
  from the service. The real UI displays the server-calculated effective status.
  If refresh fails, the success notice stays visible alongside a retryable error;
  stale forms are hidden until a refresh succeeds.
- Requests show pending/error/success feedback. Failed date updates retain the
  draft. Account failures retain the email but clear the initial password.

The development preview supports these same forms in memory, including duplicate
email feedback. It does not store passwords. Its subscription statuses use a
fixed sample date, **3 November 2026**, stated on the page. All sample data resets
on refresh, and no real accounts or subscriptions are created.

Day 4 browser checks used simulated responses and covered account creation and
duplicate errors; password clearing; equal/reversed dates; subscription creation,
editing, suspension/reactivation, deletion/cancellation; pending controls; request
methods and fields; 400/409 errors; failed detail refresh/retry; the protected
subscription route; and mobile layout. Day 3 checks were also rerun.

Before final integration, verify real account sign-in, password hashing,
subscription persistence, backend access restrictions and preservation of all
pharmacy records after subscription deletion with Mustafa and Shiam.
