# Day 1 agreements

**Status: Approved by Alaa as team leader on 1 November 2026.**

This packet covers Alaa's Day 1 preparation: shared API shapes, route decisions, database needs and ownership. The foundation has already been published. Shared layout/styling is separate Day 2 work and remains Alaa's implementation.

## Prepared files

- `packages/contracts/src/index.ts`: shared common, authentication, owner/subscription, inventory, dashboard, profile/duty and public wire types.
- `docs/API-CONTRACT.md`: approved endpoint names, request/response conventions and backend owners.
- `docs/FRONTEND-ROUTES.md`: approved browser routes, screen owners and access behavior.
- This file: schema requirements and a record of the baseline approved by Alaa.

No feature endpoint, guard, database model, business calculation or page implementation is part of this Day 1 change.

## Approved interface baseline

| Topic                | Baseline decision                                                                | Review with                    |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| IDs                  | UUID strings; backend validates IDs                                              | Mustafa and API owners         |
| Calendar dates       | `YYYY-MM-DD` strings for expiry and subscription dates                           | Mustafa, Shiam, Mohammad       |
| Business date        | Asia/Amman business timezone, shared across rules                                | All API owners                 |
| Duty instants        | ISO timestamps with an offset or Z; responses normalized to UTC                  | Hamid and Mohammad             |
| Money                | Decimal strings such as `2.50`; no currency label chosen yet                     | Mustafa, Mohammad, Alaa        |
| Lists                | `{ items, total }`; total counts filtered results; no core pagination            | API owners and frontend owners |
| Sign-in              | `{email,password}` -> `{accessToken,user}`; safe user fields only                | Mustafa and Alaa               |
| User/pharmacy link   | OWNER has null pharmacyId; PHARMACIST has exactly one pharmacy                   | Mustafa and Shiam              |
| Subscription input   | startDate, endDate, suspended; effective status is calculated                    | Shiam and Alaa                 |
| Batch edit           | Quantity, expiry and storage only; number/cost/barcode immutable                 | Mustafa and Alaa               |
| Public fields        | Exact allowlist, including nested duty periods; no internal IDs or stock details | Hamid and Yousef               |
| Search/filter values | Names and status enum values match API-CONTRACT.md                               | API owners and frontend owners |

The types describe API JSON, not database records. They do not enforce validation, authorization or output privacy at runtime. Each API owner supplies DTOs, service rules and explicit response mapping.

## Database needs for Mustafa

Alaa approved these schema requirements; Mustafa chooses and implements the actual Prisma models, relations, indexes and migrations.

| Entity       | Required information                                                                          | Relationships/rules to support                                   |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Account      | Email, password hash, OWNER/PHARMACIST role                                                   | Pharmacist belongs to one pharmacy; owner has no pharmacy        |
| Pharmacy     | Name, area, address, phone, nullable inventory-updated timestamp                              | Owns medicines, duty periods, staff and at most one subscription |
| Subscription | Start/end calendar dates, suspended flag or agreed stored state                               | One per pharmacy; deleting it preserves pharmacy data            |
| Medicine     | Display/scientific names, category, reorder threshold                                         | Pharmacy-scoped normalized name uniqueness; multiple batches     |
| Batch        | Number, integer quantity, expiry date, location, decimal purchase cost, optional barcode text | Belongs to one medicine; number unique within that medicine      |
| Duty period  | Start/end timezone-aware instants                                                             | Belongs to one pharmacy; supports overlap and overnight checks   |

Inventory and subscription indicators are calculated, not manually editable persisted statuses. Inventory mutations and inventoryUpdatedAt must be atomic. Duty overlap checks must be concurrency-safe. These are implementation tasks for the assigned backend owners.

Seed acceptance, owned by Mustafa: one owner; at least four pharmacies in at least two areas; a pharmacist per pharmacy; EXPIRED and SUSPENDED subscription examples; at least 15 medicines with batches covering all indicators and zero quantity; at least one overnight duty period.

## Review ownership

Alaa approved this baseline as team leader. The table assigns review areas; it does not record individual member approvals. Members can propose changes through Alaa and the affected owners.

| Member   | Review focus                                                            | Baseline approval |
| -------- | ----------------------------------------------------------------------- | ----------------- |
| Alaa     | Frontend routes, session needs, owner/inventory forms and shared types  | Approved by Alaa  |
| Mustafa  | Schema design, auth claims, guards, inventory payloads and shared dates | Approved by Alaa  |
| Shiam    | Owner onboarding, subscription fields/statuses and helper interface     | Approved by Alaa  |
| Hamid    | Profile/duty/public payloads, time handling and privacy                 | Approved by Alaa  |
| Mohammad | Dashboard/indicator response fields and calculation helper signatures   | Approved by Alaa  |
| Yousef   | Public search/directory fields, filters and browser paths               | Approved by Alaa  |

For a small shared helper, the implementer and consumer should agree the signature before work diverges: Mustafa with Mohammad for inventory calculations; Shiam with the API owners for subscription status; Alaa with each frontend owner for routing/component integration.

## Definition of Day 1 complete

- Foundation available to the team.
- Shared types, endpoints, frontend routes and database needs prepared and checked for consistency.
- Alaa has approved the shared boundaries as team leader; individual review feedback can be handled as a follow-up change.
- Shared package builds and the workspace typecheck passes.

Day 1 is complete under Alaa's approval of the baseline. Commit and push these contract/document changes separately before continuing Day 2. Existing layout and stylesheet edits belong to Day 2 and must stay outside the Day 1 commit.
