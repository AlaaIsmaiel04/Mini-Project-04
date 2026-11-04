# Hamid Al Haj

## Profile, duty and public backend; small display-preferences task

Branch: hamid | Plan begins when the team receives the starter.

Update 4 November 2026: Alaa has taken over the Day 11 EN/AR foundation with the user's approval. Coordinate further language changes with Alaa and use the existing provider; see `docs/LANGUAGE.md`. Dark mode remains a separate task.

Deliver the pharmacy profile/duty APIs and privacy-safe public search/directory. Spend most effort on backend core; language and theme controls are a small follow-up after your core endpoints work.

## Your code ownership

- apps/api/src/modules/pharmacy/**

- apps/api/src/modules/public/**

- apps/web/src/features/preferences/**

- apps/web/src/locales/**

- apps/web/src/theme.css

## Your agreed interfaces

- GET/PATCH /pharmacist/profile; GET/POST /pharmacist/duty-periods

- PATCH/DELETE /pharmacist/duty-periods/:id

- GET /public/medicines?q=&area=&onDutyNow=; GET /public/pharmacies

- Implement the PublicPharmacy allowlist; use shared auth/status helpers after their owners merge them. Agree interfaces on Day 1.

## Start without waiting

Pull the foundation from main into your branch. Run npm ci, copy both apps/api/.env.example and apps/web/.env.example to .env on first setup, then npm run dev. The frontend shows only a plain startup message. No database models/migrations/seed or product features are implemented. Mustafa authors the database setup; follow his instructions after that PR merges.

Read the final specification, proposed API contract, acceptance checklist and your task folders. You build the assigned pages/services yourself. There are no prebuilt guards, calculations, forms, components, adapters or fixtures. Agree interfaces early and create your own small local test data to work independently.

## Scope boundary

No public page layout, dashboard UI, inventory endpoints or schema migrations. No maps, hosting, SMS or citizen accounts. Do not spend Week 1 translating the application.


---

# Week 1 - build your area

Days are relative, not the instructor deadline. Day 7 is a review/buffer day; adjust to your availability. Deliver small reviewed PRs throughout the week.

### Day 1

Agree profile/duty/public response fields and schema needs with the team. Create your own DTOs, service fixtures, public response mapper and fixed-clock tests; no helpers, adapters or dataset are supplied.

### Day 2

Implement own profile read/update with area/address/phone validation. Inactive subscription can read; updates require ACTIVE. Do not allow changing pharmacyId or pharmacy name here.

### Day 3

Implement duty list/create/edit/delete. Validate offset-aware instants, end>start and duration<=24h; derive pharmacy from actor and enforce guessed-ID ownership.

### Day 4

Prevent overlaps, including concurrent requests (serializable transaction/retry or per-pharmacy lock). Exclude the same period on edit; allow adjacent periods. Test overnight and exact start/end.

### Day 5

Implement public pharmacy directory: ACTIVE only, area/duty filters, current and next period. Map exact public fields and nested start/end only.

### Day 6

Implement medicine search: partial display/scientific name, active subscription and at least one positive nonexpired batch. Combine area/duty filters; deduplicate pharmacies and return empty list normally.

### Day 7

Buffer/review: test privacy allowlist and inactive/expired-only/zero-only stock. Document endpoints/DTOs/auth in Swagger; publish profile/duty/public PRs.


---

# Week 2 - integrate and prove

Day 8: API integration. Day 12: core acceptance. Days 13-14: English rehearsal and fixes. No new optional features while CORE is failing.

### Day 8

Integrate profile/duty API with Mohammad and public API with Yousef. Compare payloads; show them current/next/null period examples and proper errors.

### Day 9

Add regression cases: subscription delete removes listing, future subscription hidden, exact duty end excluded, different pharmacy overlaps allowed and no private fields leak.

### Day 10

Verify all CORE endpoints pass before preferences. Add working persistent light/dark control using theme.css tokens. Keep structural page CSS owned by Alaa.

### Day 11

Add EN/AR control and small translation provider/dictionaries. Set document lang and direction; keep medicine/scientific names, phone and batch identifiers readable LTR. Arabic is optional instructor scope: cut translation expansion if core is blocked.

### Day 12

With Alaa, connect Preferences in the shell coordinated with Alaa and translate shared labels in one small integration PR. Check dark contrast, keyboard use, persistence and RTL in public/profile pages.

### Day 13

Run public availability and overnight-duty rehearsal with the team. Inspect actual JSON for private fields, including nested objects; prepare Swagger privacy example.

### Day 14

Buffer/final fixes. Explain overnight intervals, public privacy and eligible stock in English. Show one rejected overlap and a public search result.


---

# Ready-to-merge checklist

[ ] A02/A05: own pharmacy only; inactive profile/duty writes forbidden with reason; reads allowed.

[ ] A13: overnight, inclusive start/exclusive end, adjacent intervals, >24h, edit-self and simultaneous overlaps.

[ ] A14: name/area/duty combine; inactive or expired/zero-only stock never appears; no duplicate pharmacy results.

[ ] A15: exact public allowlist and ACTIVE directory; current/next/null periods; no account/subscription/cost/quantity/storage/IDs.

[ ] Preferences: persisted light/dark and EN/AR controls, sensible contrast/RTL; do not delay core for optional translation.

## Handoffs and dependencies

- Independent start: agree schema/response fields and create your own Prisma/clock test fixtures. Use the specification as the source of rules.

- Day 2-3: use Mustafa's guards and Shiam's status helper when merged; do not implement another auth/status system.

- Day 5: profile/duty examples for Mohammad; Day 6-7: public examples/endpoints for Yousef.

- Day 10-12: preferences integration with Alaa only after backend core is stable.

## Every pull request

Commit only your intended files; push your branch; open a PR into main. Include the task/rule IDs, a short explanation, and tests or screenshots. Run npm run typecheck, npm test and npm run build. Backend contributors also document their endpoints in Swagger. Alaa reviews/merges; keep .env, node_modules, dist and temporary files untracked.

## Your English presentation segment

Show an overnight duty period, reject an overlapping period, then search publicly and inspect the response allowlist in Swagger. Explain why exact quantities stay private.

Everyone should understand the whole flow: owner onboarding -> pharmacist stock -> dashboard -> public search. Be ready to explain a rule outside your own feature. Final acceptance uses real API requests and persisted PostgreSQL data; locally authored test fixtures are only for development.
