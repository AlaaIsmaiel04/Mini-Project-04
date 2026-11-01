# Proposed API contract - team planning reference

All paths start with /api. Only /health is implemented. The names below are proposals to coordinate independent work; the team must agree them on Day 1 and write the actual types, DTOs, controllers, services and tests. packages/contracts is intentionally empty. No request clients, response mappers or business logic are supplied.

## Conventions

- UUID IDs, validated with ParseUUIDPipe; validated query/body DTOs; reject unknown fields.
- Calendar dates: strict real `YYYY-MM-DD`. Expiry and subscription use `BUSINESS_TIME_ZONE=Asia/Amman`, through a shared business-date utility that Mustafa authors.
- Duty instants: ISO 8601 with explicit offset or Z. Persist as timestamptz; respond in UTC. Reject invalid/offset-less instants. Duty intervals are half-open `[start,end)`.
- Currency unspecified. Label totals as value; costs/totals are 2-digit decimal strings. Calculate using Prisma.Decimal, not floating-point accumulation.
- Lists: `{items: T[], total: number}`; total is count after filtering. No pagination in core.
- `q`: trim, partial case-insensitive matching. Inventory/public match display or scientific name; owner matches pharmacy name. Public medicine search requires nonempty q. Area: case-insensitive exact match after trimming.
- Owner status enum: ACTIVE, EXPIRED, SUSPENDED, NONE. Inventory status: HEALTHY, EXPIRING_SOON, LOW_STOCK, EXPIRED. No filter means all; reject invalid values.
- Parse `onDutyNow=true|false` explicitly; `false` means no duty restriction. Never use Boolean('false').
- POST create -> 201, GET/PATCH -> 200, DELETE -> 204 without body. Error: `{statusCode, message: string|string[], error?}`. Use 400/401/403/404/409 clearly; do not leak raw database errors.
- JWT: `{sub: userId, role: 'OWNER'|'PHARMACIST', pharmacyId: UUID|null}`, HS256, 1h. `/auth/me` loads current account. Normalize emails to trimmed lowercase; hash initial passwords with bcrypt. Never log/return hashes, passwords or tokens (except login's accessToken).
- Derive pharmacist pharmacyId from authentication. Never trust a pharmacist-submitted pharmacyId. Owner has no pharmacy and cannot edit stock.

## Endpoints

| Method and path                           | Backend owner | Access/input                             | Response                     |
| ----------------------------------------- | ------------- | ---------------------------------------- | ---------------------------- |
| GET /health                               | Starter       | Public, process only                     | `{status, service, stage}`   |
| POST /auth/login                          | Mustafa       | LoginInput                               | LoginResponse                |
| GET /auth/me                              | Mustafa       | Staff token                              | SessionUser                  |
| GET /owner/pharmacies?q=&status=          | Shiam         | OWNER                                    | ListResponse<OwnerPharmacy>  |
| POST /owner/pharmacies                    | Shiam         | OWNER; CreatePharmacyInput               | OwnerPharmacy                |
| POST /owner/pharmacists                   | Shiam         | OWNER; CreatePharmacistInput             | SessionUser                  |
| POST /owner/pharmacies/:id/subscription   | Shiam         | OWNER; SubscriptionInput                 | Subscription                 |
| PATCH /owner/pharmacies/:id/subscription  | Shiam         | OWNER; SubscriptionInput, all fields     | Subscription                 |
| DELETE /owner/pharmacies/:id/subscription | Shiam         | OWNER                                    | 204; retain other data       |
| GET /pharmacist/medicines?q=&status=      | Mustafa       | Own PHARMACIST; inactive may read        | InventoryResponse            |
| POST /pharmacist/medicines                | Mustafa       | Active own; MedicineInput                | InventoryMedicine            |
| PATCH /pharmacist/medicines/:id           | Mustafa       | Active own; MedicineInput, all fields    | InventoryMedicine            |
| POST /pharmacist/medicines/:id/batches    | Mustafa       | Active own; CreateBatchInput             | Batch                        |
| PATCH /pharmacist/batches/:id             | Mustafa       | Active own; UpdateBatchInput, all fields | Batch                        |
| GET /pharmacist/dashboard                 | Mohammad      | Own PHARMACIST; inactive may read        | Dashboard                    |
| GET /pharmacist/profile                   | Hamid         | Own PHARMACIST; inactive may read        | ProfileResponse              |
| PATCH /pharmacist/profile                 | Hamid         | Active own; area/address/phone           | ProfileResponse              |
| GET /pharmacist/duty-periods              | Hamid         | Own PHARMACIST                           | ListResponse<DutyPeriod>     |
| POST /pharmacist/duty-periods             | Hamid         | Active own; DutyInput                    | DutyPeriod                   |
| PATCH /pharmacist/duty-periods/:id        | Hamid         | Active own; DutyInput                    | DutyPeriod                   |
| DELETE /pharmacist/duty-periods/:id       | Hamid         | Active own                               | 204                          |
| GET /public/medicines?q=&area=&onDutyNow= | Hamid         | Public, q required                       | ListResponse<PublicPharmacy> |
| GET /public/pharmacies?area=&onDutyNow=   | Hamid         | Public                                   | ListResponse<PublicPharmacy> |

Medicine search returns each pharmacy once even if several batches match. Directory returns ACTIVE pharmacies even with no stock. Empty = `{items:[], total:0}`. Public fields only: name, area, address, phone, onDutyNow, currentDuty, nextDuty, inventoryUpdatedAt. Public duty objects contain startsAt/endsAt only. Periods/timestamp may be null. No IDs, quantities, costs, storage, barcodes, users or subscription details in public output.

## Shared work the members implement

- Mustafa creates JWT/role/ownership/subscription-write guards, actor types and the shared business-date utility. He shares usage/signatures early; no security helper already exists.
- Shiam implements/tests the effective-subscription-status helper. All API owners reuse it once merged.
- Mohammad implements/tests pure inventory/dashboard calculations and agrees signatures with Mustafa first. No calculated values or date-rule implementation is supplied.
- Inventory mutations and inventoryUpdatedAt must be atomic. Hamid implements concurrency-safe duty overlap prevention. These are member tasks, not existing behavior.
- Each backend owner writes controllers/services/DTOs, persistence calls, public/private response mapping, Swagger and tests in their module.
- Alaa coordinates shared wire types, routing, UI primitives and request/session handling. Each frontend member designs/builds their own pages and may create local feature fixtures while APIs are unfinished.

Interface names in the endpoint table are proposed labels, not exported TypeScript interfaces. Define their fields together using the teacher specification. Update this document when an agreed interface changes. No product data or mock/API toggle is built into the foundation.
