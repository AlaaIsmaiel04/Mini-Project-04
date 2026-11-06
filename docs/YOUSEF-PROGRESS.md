# Yousef scope: implementation and handoff

6 November 2026. Implemented by Codex at Alaa's request on `alaa`.
This records implemented work without attributing commits or a presentation to Yousef.

## Daily checklist

| Days  | Delivered                                                                                                                                                    | Remaining                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-4   | Two routed public pages, explicit medicine submit, area/duty filters, shared pharmacy cards, phone links, current/next/null periods and inventory timestamps | None for frontend implementation                                                                                                                                                    |
| 5-7   | Loading, initial, empty and error states; retry, responsive cards, labels and desktop/mobile screenshots                                                     | Yousef should review and understand the delivered code                                                                                                                              |
| 8-9   | Real directory requests verified against PostgreSQL; search sends partial/scientific text and combined filters to Hamid's endpoint                           | Real medicine search returns 503: Hamid must connect the medicine-availability store to Prisma, using Mustafa's existing stock schema. Then repeat real name/case/filter acceptance |
| 10-11 | Abort/stale-request protection, submitted-query retry, result count, reset and accurate duty wording; Jordan timezone and null values                        | None for frontend implementation                                                                                                                                                    |
| 12    | EN/AR labels, RTL, keyboard submit/focus and 320/390/768/1440 layouts checked                                                                                | Dark-mode check waits for the theme implementation; dark mode is not implemented by these pages                                                                                     |
| 13-14 | Citizen demonstration script and privacy checks prepared below                                                                                               | Full live stock-search rehearsal and Yousef's own English presentation need the working backend and his participation                                                               |

## Verification

- Typecheck and production build pass.
- 435 API tests and 14 frontend tests pass. Three new public request/privacy/time tests cover query encoding, explicit false, no bearer token, cancellation signal, directory field allowlisting, nested response allowlisting and failure without sample fallback.
- Headless browser checks: real unauthenticated directory uses isolated PostgreSQL, includes an active pharmacy and excludes a suspended one. Null duty/timestamp fields render clearly. Real valid medicine search shows the expected 503 with Retry.
- Frontend success scenarios use explicitly intercepted API responses: simultaneous filters, scientific query submission, phone link, result count, current/next overnight times, empty results, failed-request retry retaining filters, pending indicator and stale-result cancellation.
- Browser checks also cover clear/reset, empty-query validation/focus, keyboard Enter, Arabic RTL and narrow layouts without horizontal overflow or JavaScript exceptions. These checks do not prove real medicine-stock availability.
- Temporary fixtures are removed. No database schema, backend feature or production sample fallback was added.

Evidence: `output/yousef/browser-checks.json`, `directory-desktop.png`,
`directory-arabic-mobile.png`, `search-desktop.png`, `search-empty.png` and
`search-error.png`. Screenshots use controlled test data.

## Manual acceptance after the stock adapter is ready

1. Use real seeded data: an active pharmacy with eligible stock, one expired-only,
   one zero-stock, and one inactive pharmacy. Include overlapping display/scientific names.
2. At `/`, submit a partial name and then an uppercase scientific-name fragment.
   Eligible pharmacies should appear once each. No expired-only, zero-stock or
   inactive result should appear. Do not calculate availability in React.
3. Combine area and on-duty filters; test a nonexistent area and a no-match name.
   Confirm the visible count, clear/reset and retry retain the intended behavior.
4. At `/pharmacies`, confirm active pharmacies with no stock still appear.
   Check current, next and absent duty periods, and missing inventory timestamps.
5. Navigate using Tab/Shift+Tab and Enter, repeat at 390 px in English and Arabic,
   and confirm only public fields appear in the DOM and network response.

Hamid owns the public stock adapter and public response privacy. Mustafa can help
with the existing Prisma schema. Shiam's unfinished owner UI/API does not block
building these public pages; full onboarding-to-public acceptance still needs it.

## English presentation script

“This is the citizen area of SmartShelf. You can search without an account.
Enter a medicine name or its scientific name and press Search pharmacies.
You can narrow the results by area or pharmacies currently on duty.

Each result shows the pharmacy's name, address, phone number and duty schedule.
Times are displayed in Jordan time. Not on duty does not mean closed: we do not
know the pharmacy's general opening hours. Please call to confirm availability.

Citizens cannot see exact quantities, costs, batches, account details or subscriptions.
When there are no matches, the page suggests adjusting the search. If the service
is unavailable, we show an error and let you retry without losing your search.
The directory lists active pharmacies independently of medicine availability.
Both pages work on mobile and support English and Arabic.”

Until the stock adapter is connected, explicitly explain that real medicine search
is unavailable. Do not present intercepted or fixture results as live stock.

No commit or push was performed for this work.
