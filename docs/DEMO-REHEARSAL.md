# English demo and final review

Prepared for Days 13–14. This is a rehearsal plan, not evidence that the product or rehearsal is complete. Run after real API/database integration and CORE acceptance.

## Before presenting

- Freeze optional scope. Use the final teacher specification and `ACCEPTANCE.md`.
- Run typecheck, tests, build and smoke; fix failures before the demo. Smoke checks foundation health only.
- Follow Mustafa's merged migration/seed instructions on a dedicated local PostgreSQL database. Confirm the seed's actual dates match the demo day in Asia/Amman, including active/expired subscriptions, expiry boundaries and overnight duty.
- Use actual seeded credentials privately. Never put passwords or tokens in slides, screenshots, logs or this document.
- Confirm the full flow with real requests. Development fixture routes do not demonstrate persistence or backend rules.
- Have a second member start the application from the README on their laptop. Check `git ls-files` for accidentally tracked secrets, dependencies or build output before submission.

## Speaking order

| Presenter | What to demonstrate and explain                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Alaa      | Introduce the problem, owner/inventory UX, responsive navigation and request feedback; coordinate handoffs                         |
| Shiam     | Create pharmacy, pharmacist account and subscription; explain stored suspension versus effective status                            |
| Mustafa   | Sign in as that pharmacist, add medicine/batch; show protected Swagger and pharmacy scoping                                        |
| Mohammad  | Show real dashboard metrics and simultaneous indicators; explain available value versus expired waste; demonstrate profile/duty UI |
| Hamid     | Explain overnight duty/overlap rejection and inspect the public response allowlist                                                 |
| Yousef    | Search publicly with area/on-duty filters, show contact information and a no-results state                                         |

Then return to Shiam/Mustafa to suspend or delete the subscription. Show that a pharmacist can still read but a direct API write is rejected, the public listing disappears, and pharmacy inventory remains stored. Restart the backend and show persistence. Every presenter should understand the complete flow and answer questions outside their assigned screen.

## Alaa's short segment

“SmartShelf helps pharmacists see what is available, what is running low and what may expire. It also helps citizens find an on-duty pharmacy without exposing private stock details. The owner manages access through pharmacy subscriptions.

I built the shared frontend, sign-in and role navigation, and the owner and inventory workflows. Forms keep the user's draft when the server rejects a request and show the reason. Successful stock changes refresh the inventory without a page reload.

One UI decision was to keep inactive pharmacies readable while disabling changes. The backend independently enforces that rule. The frontend also shows every applicable medicine indicator, because low stock and expiring stock can happen together.”

End with one limitation actually present in the final build. Do not claim unfinished APIs, database rules, language support, Figma implementation or automated tests are complete. Prepare a brief explanation of controller → service → Prisma, why medicine and batch are separate, and one rejected validation case.

## Final gate

- [ ] CORE A01–A17 verified against real APIs and persisted data.
- [ ] Loading, empty, error, success, invalid input and inactive-write behavior shown.
- [ ] Public responses inspected for private-field leakage.
- [ ] Mobile and keyboard workflows checked.
- [ ] Clean setup proven on another member's laptop.
- [ ] All six members have rehearsed in English and understand one business rule.
- [ ] README reflects actual merged setup, credentials provisioning and limitations.
- [ ] Figma implementation starts after these functional dependencies are resolved, as agreed.
