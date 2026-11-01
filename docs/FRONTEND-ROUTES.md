# Frontend routes - Day 1 baseline

**Status: Approved by Alaa as team leader on 1 November 2026. Router implementation belongs to Day 2.**

These are browser page URLs. Backend endpoints start with `/api` and are listed separately in API-CONTRACT.md.

| Browser path                                 | Screen                                         | Frontend owner | Intended access          |
| -------------------------------------------- | ---------------------------------------------- | -------------- | ------------------------ |
| `/`                                          | Medicine search                                | Yousef         | Public, no sign-in       |
| `/pharmacies`                                | Pharmacy directory                             | Yousef         | Public, no sign-in       |
| `/login`                                     | Shared staff sign-in                           | Alaa           | Owner/pharmacist sign-in |
| `/owner`                                     | Pharmacy list, onboarding and account creation | Alaa           | OWNER                    |
| `/owner/pharmacies/:pharmacyId/subscription` | Subscription editor                            | Alaa           | OWNER                    |
| `/pharmacist`                                | Dashboard and attention items                  | Mohammad       | PHARMACIST               |
| `/pharmacist/inventory`                      | Medicine and batch management                  | Alaa           | PHARMACIST               |
| `/pharmacist/profile`                        | Profile and duty-period management             | Mohammad       | PHARMACIST               |

## Navigation and session behavior

- Keep public medicine search and directory available without an account.
- After sign-in, owners land on `/owner`; pharmacists land on `/pharmacist`.
- Alaa implements shared navigation, route protection and sign-out in Day 2 work.
- Without a valid session, private content must not be shown. The sign-in screen should explain that sign-in is needed.
- A user with the wrong role receives an access message or is redirected to their own dashboard. Agree the final UX with the team.
- Inactive pharmacists can still open their own pages; disable mutation controls with a clear subscription explanation. The API must independently enforce this rule.
- Hamid's language/theme controls attach to the shared shell after his core backend tasks. Preferences are not separate business routes.
- Include a not-found screen for unknown paths during routing implementation.

## Boundaries

Each screen owner builds their own page components. Alaa coordinates the router and shared layout. Agree component export names during integration; this document does not require anyone to create another member's page.

Before changing a path, check the shared navigation and links with the affected frontend owner. Alaa's baseline approval is recorded in DAY-1-AGREEMENTS.md.
