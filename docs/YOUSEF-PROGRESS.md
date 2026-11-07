# Yousef scope: implementation and handoff

Updated 7 November 2026 after Hamid's PR #18 and Alaa's theme integration. Implemented by Codex at Alaa's request on `alaa`; this does not attribute commits or a presentation to Yousef.

## Daily checklist

| Days | Delivered | Remaining |
| --- | --- | --- |
| 1-4 | Public search/directory, explicit submit, area/duty filters, cards, phone links, current/next/null duty and timestamps | None for frontend implementation |
| 5-7 | Initial/loading/empty/error states, retry, responsive cards and labels | Yousef should understand the delivered code |
| 8-9 | Real directory and medicine search use Hamid's Prisma adapter; database tests cover partial/scientific/case matching, filters, eligible stock and privacy | Full owner-onboarding acceptance needs Shiam |
| 10-11 | Stale-request cancellation, submitted-query retry, result count/reset and Jordan duty times | None for frontend implementation |
| 12 | Shared EN/AR, RTL, keyboard controls and Light/Dark/System integration; responsive layouts and contrast checked | Physical-device testing remains a team check |
| 13-14 | Live search/directory browser flows and privacy tests pass; script prepared below | Actual team rehearsal and Yousef's English presentation |

## Current verification

- Typecheck and production build pass; 485 API unit tests and 23 frontend tests pass.
- All 36 PostgreSQL/HTTP tests pass through the integration runner, including public search, eligible stock, subscription lifecycle visibility, literal filters, duty boundaries and exact nested public fields.
- Real browser checks use a separate seeded database: unauthenticated medicine search returns the eligible pharmacy, directory results render, and sign-in/dashboard/inventory/profile/duty flows work.
- Shared theme checks cover persisted Light/Dark preferences, live System changes, before-paint boot, blocked storage, keyboard controls, drafts/session preservation, English/Arabic and 320/390/768/1024/1440 layouts.
- Existing frontend tests/checks cover clear/reset, empty-query validation, retry retaining submitted filters, phone links, empty/error states and failure without a sample fallback.
- Owner forms are checked through synthetic development previews; real owner APIs remain Shiam's dependency.

Current evidence: `output/theme/browser-checks.json` and its screenshots. Older `output/yousef/` captures use controlled data and remain historical evidence, not live stock screenshots.

## Team rehearsal with the live stock adapter

1. Use real seeded data: an ACTIVE pharmacy with eligible stock, expired-only stock, zero stock and an inactive pharmacy.
2. At `/search`, submit partial and uppercase scientific-name fragments. Eligible pharmacies appear once each; inactive/expired-only/zero-only results stay hidden.
3. Combine area/on-duty filters. Check no-match results, counts, clear/reset and retry.
4. At `/pharmacies`, verify active pharmacies without stock, current/next/null duty and missing timestamps.
5. Repeat keyboard and 390px flows in English/Arabic and both themes. Inspect DOM/network responses for public-only fields.

Hamid's persisted search adapter is merged. Shiam's owner API does not block public browsing, but full onboarding-to-public acceptance still needs it. Automated checks do not replace the team's rehearsal.

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

Use the running API and dedicated seeded database for the live demonstration. Do not present intercepted or fixture results as live stock.
