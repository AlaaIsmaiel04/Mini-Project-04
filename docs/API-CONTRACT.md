# API contract - Day 1 baseline

**Status: Approved by Alaa as team leader on 1 November 2026.**

All backend paths start with `/api`. Shared request/response types are declared in `packages/contracts/src/index.ts`. The Day 1 interfaces remain the approved baseline. As of 7 November 2026, health, authentication, inventory, dashboard, profile/duty and public directory/medicine search endpoints are implemented; owner administration remains pending. See Swagger for current DTOs and examples.

Use the [frontend routes](FRONTEND-ROUTES.md) and [Day 1 agreements](DAY-1-AGREEMENTS.md) as the approved baseline. Coordinate any interface changes with Alaa and the affected feature owners.

## Conventions

- UUID IDs, validated with ParseUUIDPipe; validated query/body DTOs; reject unknown fields.
- Calendar dates: strict real `YYYY-MM-DD`. Expiry and subscription use `BUSINESS_TIME_ZONE=Asia/Amman`, through a shared business-date utility that Mustafa authors.
- Duty instants: ISO 8601 with explicit offset or Z. Persist as timestamptz; respond in UTC. Reject invalid/offset-less instants. Duty intervals are half-open `[start,end)`.
- Currency unspecified. Label totals as value; costs/totals are 2-digit decimal strings. Calculate using Prisma.Decimal, not floating-point accumulation.
- Lists: `{items: T[], total: number}`; total is count after filtering. No pagination in core.
- `q`: trim, partial case-insensitive matching. Inventory/public match display or scientific name; owner matches pharmacy name. Public medicine search requires nonempty q. Area: case-insensitive exact match after trimming.
- Owner status enum: ACTIVE, EXPIRED, SUSPENDED, NONE. Inventory status: HEALTHY, EXPIRING_SOON, LOW_STOCK, EXPIRED. No filter means all; reject invalid values.
- Parse `onDutyNow=true|false` explicitly; `false` means no duty restriction. Never use Boolean('false').
- POST create -> 201, GET/PATCH -> 200, DELETE -> 204 without body. Error: `{statusCode, message: string|string[], error?}`. Use 400/401/403/404/409 clearly. Unexpected failures, including database outages, return 500 with `Internal server error`; never leak raw database errors. Clients also handle temporary 503 responses safely.
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

The types named in the table are exported by `@smartshelf/contracts`. They are wire shapes, not Prisma models or validated DTO classes. Review their fields with each assigned API/frontend owner. The baseline is approved by Alaa in DAY-1-AGREEMENTS.md. Update the types and documentation together when a later change is agreed.

## Wire-field decisions

- SessionUser contains id, email, role and pharmacyId only. It never contains passwords or password hashes. Backend validation enforces a null pharmacyId for OWNER and one pharmacy ID for PHARMACIST.
- Subscription contains stored startDate/endDate/suspended; OwnerPharmacy separately includes calculated subscriptionStatus. Expiry and suspension calculation remains Shiam's task.
- CreatePharmacyInput contains name/area/address/phone. UpdateProfileInput permits only area/address/phone.
- CreatePharmacistInput contains email/password/pharmacyId and is owner-only. Password hashing stays on the backend.
- MedicineInput contains displayName/scientificName/category/reorderThreshold. InventoryMedicine adds id, availableQuantity, all calculated indicators and nested batches.
- CreateBatchInput includes batchNumber, quantity, expiryDate, storageLocation, unitCost and optional barcode text. UpdateBatchInput permits quantity/expiryDate/storageLocation only. Batch responses use a nullable barcode and date-based batch indicators.
- Dashboard includes all seven required metrics: totalMedicines, totalUnits, inventoryValue, expiringSoonBatchCount, lowStockMedicineCount, expiredBatchCount and expectedWaste, plus pharmacyName/subscriptionStatus/attentionItems.
- DutyInput contains startsAt/endsAt. Private DutyPeriod adds id. PublicDutyPeriod contains timestamps only.
- PublicPharmacy is an independent allowlist rather than a private record with fields omitted by accident. It has name/area/address/phone, onDutyNow, nullable current/next duty periods and a nullable inventoryUpdatedAt.
- ListResponse.total counts results after filters. InventoryResponse also exposes the pharmacist's own subscription status. Public directory filters are area/onDutyNow; medicine search additionally requires q.
- Empty optional barcode input may be omitted; absent barcode in a batch response is null. Unknown inventory-update fields must still be rejected by DTOs.

TypeScript uses structural typing: typing a database object as PublicPharmacy does not remove extra fields at runtime. Hamid must explicitly construct the public response, including its nested periods. Strings for dates and amounts are only transport types; backend DTOs/services validate actual formats, ranges and business rules.

The business timezone and decimal representation are approved baseline decisions. Currency is unspecified; avoid adding an assumed currency symbol. No product data, mock mode or feature implementation is added by these declarations.
