<!-- Page 1 -->

# SmartShelf — Pharmacy Management & Public

# Medicine Search

Weekly Mini Project 04 — Team 2 · Project Specification

|  |  |
| --- | --- |
| Project | SmartShelf — Pharmacy Management & Public Medicine Search |
| Team leader | Alaa Ismaiel |
| Team members | Shiam Ezzo, Mohammad Kashmar, Yousef Yousef, Mustafa Al Shaar, Hamid Al Haj |
| Stack | React + TypeScript · NestJS · PostgreSQL through Prisma · JWT · Swagger |
| Submission | Your instructor will confirm the submission date and the presentation date. |

Pharmacists always know what is on their shelves and what is about to expire — and citizens can find which on-duty pharmacy has their medicine.

## 1. Project Overview

Pharmacies lose money on medicines that expire unnoticed on the shelf, and they run out of popular medicines without warning. At night, citizens drive from pharmacy to pharmacy looking for one that is open and has the medicine they need.

SmartShelf connects three areas:

an owner dashboard, where the platform owner manages pharmacies, pharmacist accounts and their subscriptions; a pharmacist dashboard, where each pharmacist manages their own pharmacy's medicines, batches, expiry dates, stock levels and on-duty periods; a public website, where any citizen — without signing in — can search for a medicine and see which pharmacies have it available and which are on duty now.

The central idea is that public information is derived from private inventory data: a pharmacy appears as "available" for a medicine only when it has eligible stock, but citizens never see quantities, batch numbers, prices or any internal record.

## 2. Team

The team leader and members are listed in the table at the top of this document.

Team Responsibility The leader coordinates the internal work split and makes sure the team reaches a working integrated result. Frontend/backend ownership is not assigned by the instructor. The team should decide how responsibilities are distributed. Every member must make a meaningful contribution. Every member should understand the project at a high level. Every member must participate in the final English presentation.

## 3. Product Goals

By the end of the project, the application must allow:

1 / 9


<!-- Page 2 -->

the owner to create pharmacies and pharmacist accounts, and to manage each pharmacy's subscription; a pharmacist to manage medicines and their batches for their own pharmacy only; the system to calculate, for every medicine and batch, whether it is expired, expiring soon or low in stock, and to summarize this on a dashboard; a pharmacist to publish on-duty periods; citizens to search medicines and on-duty pharmacies on a public page that shows only public information.

# 4. Technology Constraints

| Area | Requirement |
| --- | --- |
| Frontend | React + TypeScript |
| Backend | NestJS |
| Database | PostgreSQL, accessed through Prisma (schema + migrations) |
| Authentication | JWT, with role and pharmacy-ownership checks on the backend |
| API documentation | Swagger / OpenAPI |

All data is stored in PostgreSQL and survives a backend restart. Every important rule is enforced by the backend. The frontend may also check input for a better experience, but the backend must reject invalid operations on its own. Do not add payments, automatic billing, barcode scanners, maps, SMS/email, external AI services or cloud deployment. The application runs locally for the demo.

# 5. User Roles

| Role | Who | Can | Cannot |
| --- | --- | --- | --- |
| Owner | The platform owner. One seeded account. | Create pharmacies; create pharmacist accounts linked to one pharmacy; create, change, suspend and delete subscriptions; see all pharmacies and their subscription status. | Change a pharmacy's inventory. |
| Pharmacist | Works in exactly one pharmacy. Account created by the owner. | Manage medicines, batches, the pharmacy profile and duty periods of their own pharmacy; see their dashboard and their own subscription status. | See or change another pharmacy's data; change any subscription; make changes while their pharmacy's subscription is not active. |
| Citizen | Any visitor, without signing in. | Search medicines; see pharmacies that have a medicine available, which are on duty now, their area, address and phone, and when their inventory was last updated. | See quantities, batch numbers, prices, storage locations, subscriptions or any internal record. |

# 6. User Scenario

At 23:00 Ahmad needs an antibiotic for his son. He opens SmartShelf and searches "amoxicillin". The results show three pharmacies in his area that have it available; one of them is on duty now until 08:00 tomorrow. He also sees "inventory updated 2 hours ago" for that pharmacy, so he calls it before going.

Earlier that day, the pharmacist at that pharmacy added a new batch of amoxicillin (120 units, expiring in eight months). Another batch of the same medicine had expired last week: it is still in the inventory, marked EXPIRED, and counted in the dashboard's expected waste — but it does not make the pharmacy appear as available in

2 / 9


<!-- Page 3 -->

public search. A third medicine dropped to 8 units, below its reorder threshold of 10, so the dashboard lists it under Low stock.

On the owner dashboard, Alaa sees that one pharmacy's subscription ended yesterday. Its status is now EXPIRED: that pharmacy no longer appears in public search, and its pharmacist can still sign in and view the inventory but cannot change anything until the subscription is renewed.

# 7. Main User Flows

Each flow is written as user action → business operation → stored result → visible result.

Flow A — Owner onboards a pharmacy

1. The owner creates a pharmacy, a pharmacist account for it, and an ACTIVE subscription with start and end

dates → the backend validates the data and the account is linked to that one pharmacy → the pharmacy appears in the owner's list with its subscription status → the pharmacist can sign in.

Flow B — Pharmacist adds stock

1. The pharmacist adds a batch of a medicine (creating the medicine first if it does not exist in their pharmacy) →

the backend checks the subscription, ownership and validation rules → the batch is stored and the pharmacy's "inventory last updated" time changes → the inventory list, dashboard indicators and public search update.

Flow C — Pharmacist reviews attention items

1. The pharmacist opens the dashboard → the backend calculates indicators and attention items from stored

batches and today's date → nothing is changed → expired, expiring-soon and low-stock items are listed with their reasons.

Flow D — Citizen searches

1. The citizen searches a medicine name, optionally with "on duty now" and an area filter → the backend finds

pharmacies with eligible stock and an active subscription → nothing is changed → matching pharmacies are listed with public fields only, or an empty state when none match.

Flow E — Subscription changes

1. The owner suspends a subscription, or its end date passes → the subscription's effective status is

SUSPENDED or EXPIRED → the pharmacy disappears from public results and the pharmacist's change operations are rejected; inventory and history are kept.

# 8. Functional Requirements

Owner

FR-1 The owner can sign in, create pharmacies (name, area, address, phone) and create pharmacist accounts linked to one pharmacy, with a hashed initial password. FR-2 The owner can create a subscription for a pharmacy (start date, end date, status ACTIVE or SUSPENDED), change its dates, suspend or reactivate it, and delete it. FR-3 The owner sees all pharmacies with their effective subscription status (ACTIVE, EXPIRED, SUSPENDED or NONE) and can filter by that status and search by pharmacy name.

Pharmacist inventory

FR-4 A pharmacist can create, edit and list the medicines of their pharmacy: display name, scientific name, category and reorder threshold. FR-5 A pharmacist can add batches to a medicine: batch number, quantity, expiry date, storage location, unit purchase cost and optional barcode text.

3 / 9


<!-- Page 4 -->

FR-6 A pharmacist can edit a batch's quantity, expiry date and storage location. Batch number, unit cost and barcode are read-only after creation. FR-7 The inventory list shows each medicine with its total available quantity, its batches and the calculated indicators; it supports search (display or scientific name, partial, case-insensitive) and a status filter: All, Healthy, Expiring soon, Low stock, Expired. The number of visible items is shown.

Pharmacist dashboard and duty

FR-8 The dashboard shows: total medicines; total units on shelf (non-expired); inventory value (non-expired); number of expiring-soon batches; number of low-stock medicines; expired batch count and expected waste value; and the list of attention items. FR-9 A pharmacist can edit their pharmacy profile (address, phone, area) and add, edit and delete duty periods (start date-time, end date-time).

Public website

FR-10 A citizen can search medicines by display or scientific name (partial, case-insensitive), optionally filtered by area and by "on duty now". FR-11 A citizen can browse the pharmacy directory, filtered by area and by "on duty now", with each pharmacy's next or current duty period. FR-12 Each public result shows pharmacy name, area, address, phone, whether it is on duty now and the inventory last-updated time — nothing else.

# 9. Business Rules

Scoping and roles R-1 Every medicine, batch and duty period belongs to exactly one pharmacy. A pharmacist can read or change records of their own pharmacy only; any attempt on another pharmacy's record is rejected as forbidden (or not found), even if the id is guessed. R-2 Only the owner can create, change or delete pharmacies, pharmacist accounts and subscriptions.

Subscriptions R-3 A pharmacy's effective subscription status is: SUSPENDED if its subscription is suspended; otherwise EXPIRED if today is after the end date; otherwise ACTIVE if today is between the start and end dates (inclusive); NONE if it has no subscription or the start date is in the future. R-4 A pharmacy has at most one subscription. The end date must be after the start date. R-5 Only pharmacies with an ACTIVE subscription appear in public results. R-6 A pharmacist whose pharmacy is not ACTIVE can sign in and read their data, but every change is rejected as forbidden with the reason. R-7 Deleting a subscription is allowed. It removes only the subscription: the pharmacy, its medicines, batches, duty periods and all historical pharmacy data stay unchanged. After deletion the pharmacy's effective status is NONE (R-3).

Medicines and batches R-8 Medicine display names are unique within a pharmacy (ignoring upper/lower case and surrounding spaces). R-9 Batch numbers are unique within the same medicine. R-10 Quantities are whole numbers of zero or more; reorder threshold, unit cost are zero or more. R-11 A batch with an expiry date that has already passed can be registered (for accurate waste tracking), but it is EXPIRED from the start.

4 / 9


<!-- Page 5 -->

Calculated statuses (never typed by hand) R-12 A batch is EXPIRED when its expiry date is before today. R-13 A batch is EXPIRING SOON when it is not expired and expires within the next 90 days (today included). R-14 A medicine's available quantity is the sum of quantities of its non-expired batches. R-15 A medicine is LOW STOCK when its available quantity is at or below its reorder threshold. R-16 A medicine is HEALTHY when it is not low stock and none of its non-empty batches is expired or expiring soon. R-17 Statuses are separate indicators: a medicine can be LOW STOCK and have an EXPIRING SOON batch at the same time, and both are shown. The status filter returns every medicine that has that indicator. R-18 All statuses are calculated by the backend for today's date when requested. They are never stored as editable fields.

Dashboard values R-19 Inventory value = sum of quantity × unit cost of non-expired batches. R-20 Expected waste = sum of quantity × unit cost of expired batches with quantity above zero.

Duty periods R-21 A duty period's end must be after its start, and a duty period cannot be longer than 24 hours. R-22 Duty periods of the same pharmacy must not overlap. R-23 A pharmacy is on duty now when the current time is at or after a period's start and before its end. Periods that cross midnight (for example 20:00 → 08:00 the next day) must work correctly.

Public availability and privacy R-24 A pharmacy is available for a medicine when it has an ACTIVE subscription and at least one batch of that medicine that is not expired and has a quantity above zero. R-25 Public endpoints return only: pharmacy name, area, address, phone, on-duty-now flag, current/next duty period and inventory last-updated time. They never return quantities, batch numbers, costs, storage locations, barcodes, subscription data or account data. R-26 The inventory last-updated time of a pharmacy changes whenever one of its medicines or batches is created or changed.

# 10. Frontend Requirements

Required screens

| Screen | Who | Must show / allow |
| --- | --- | --- |
| Public Search | Everyone | Medicine search with area and on-duty filters; results with public fields; empty state. |
| Pharmacy Directory | Everyone | Pharmacies with area and on-duty filters and current/next duty period. |
| Sign in | Owner, pharmacist | One sign-in page; the user lands on the dashboard for their role. |
| Owner Pharmacies | Owner | Pharmacies with effective subscription status, filter and search; create pharmacy and pharmacist account. |
| Owner Subscription | Owner | Create, change dates, suspend/reactivate and delete a pharmacy's subscription. |
| Pharmacist Dashboard | Pharmacist | Indicators from FR-8, attention items, the pharmacy name and the subscription status. |

5 / 9


<!-- Page 6 -->

| Screen | Who | Must show / allow |
| --- | --- | --- |
| Inventory | Pharmacist | Medicines with batches, indicators, search, status filter, visible-item count; add/edit medicine and batch forms. |
| Pharmacy Profile & Duty | Pharmacist | Profile form and duty-period list with add/edit/delete. |

Required behavior Every screen that loads data shows a loading state, an empty state and an error state. Forms show the backend's validation messages clearly. Business-rule rejections (for example "your subscription is expired — changes are not allowed") are shown clearly. Indicators use clear badges; a medicine with several indicators shows all of them. After a successful change, the inventory list and dashboard values update without a manual page reload. When there is no valid sign-in, dashboard screens show a sign-in prompt instead of their content.

# 11. Data Modeling Guidance

The information below must be represented. How you split it into Prisma models, fields and relations is your team's design decision.

| Entity | Purpose | Important information | Important relationships |
| --- | --- | --- | --- |
| User account | Signing in and role | email, hashed password, role (OWNER or PHARMACIST) | A pharmacist belongs to one pharmacy |
| Pharmacy | A pharmacy that can be listed publicly | name, area, address, phone, inventory last-updated time | Has pharmacists, one subscription, medicines and duty periods |
| Subscription | Controls access and public listing | start date, end date, suspended flag (or status) | Belongs to one pharmacy |
| Medicine | A product the pharmacy stocks | display name, scientific name, category, reorder threshold | Belongs to one pharmacy; has many batches |
| Batch | A delivery of a medicine with its own expiry | batch number, quantity, expiry date, storage location, unit cost, barcode | Belongs to one medicine |
| Duty period | When the pharmacy is on duty | start date-time, end date-time | Belongs to one pharmacy |

Why separate Medicine from Batch? One medicine can be on the shelf in several deliveries with different quantities and expiry dates. Expiry belongs to a batch; the reorder threshold belongs to the medicine. Be ready to explain this in your presentation.

# 12. Backend Requirements

Architecture: Controller → Service → Persistence (Prisma). Controllers receive requests and return responses; services contain all business rules, including ownership checks and status calculations; database access happens only in services. Validation: every request body, route parameter and query parameter is validated with DTOs; unknown fields are rejected. Authentication and authorization: JWT sign-in; owner-only and pharmacist-only operations are protected with guards; pharmacy ownership is checked for every pharmacist operation; the subscription rule (R-6) is enforced for every pharmacist change.

6 / 9


<!-- Page 7 -->

Public/private separation: public endpoints return dedicated response shapes containing only public fields — never full database records. HTTP errors: bad request, unauthorized, forbidden, not found and conflict, each with a clear message. Filtering and search: as described in FR-3, FR-7, FR-10 and FR-11. Logger: log meaningful events — pharmacy and pharmacist created, subscription changes, batches added, changes rejected because of the subscription, and cross-pharmacy access attempts. Never log passwords or tokens. Swagger: every endpoint documented with a summary, grouped by area (owner, pharmacist, public), with bodies, parameters and authentication visible. Persistence: a seed script creates the owner, at least 4 pharmacies in at least 2 areas (one with an EXPIRED and one with a SUSPENDED subscription), a pharmacist for each, at least 15 medicines with batches covering every indicator (including expired, expiring-soon, low-stock and zero-quantity batches), and duty periods including one that crosses midnight.

# 13. Validation & Error Scenarios

| Situation | Expected behavior |
| --- | --- |
| Missing required fields, negative quantity/threshold/cost, invalid date | Rejected with a clear message; nothing is changed. |
| Duplicate medicine name in the same pharmacy, or duplicate batch number for the same medicine | Rejected as a conflict. |
| Subscription end date before start date; a second subscription for the same pharmacy | Rejected. |
| A pharmacist reads or changes another pharmacy's medicine, batch or duty period | Rejected as forbidden (or not found); logged. |
| A pharmacist calls an owner-only operation | Rejected as forbidden. |
| A pharmacist changes anything while the subscription is EXPIRED, SUSPENDED or NONE | Rejected as forbidden with the reason. |
| Any protected operation without a valid token | Rejected as unauthorized. |
| Duty period ending before it starts, longer than 24 hours, or overlapping another | Rejected. |
| A medicine, batch, pharmacy or subscription that does not exist | "Not found". |
| A public search with no matching pharmacies | Empty state with a helpful message, not an error. |

# 14. CORE

Everything in this list is required for a complete submission:

Sign-in with JWT, owner/pharmacist roles and pharmacy-scoped access enforced on the backend. Owner: pharmacies, pharmacist accounts, subscriptions with effective status, filter and search. Pharmacist: medicines and batches with all validation rules; inventory list with search, status filter and visible count. Calculated indicators (expired, expiring soon, low stock, healthy) and the dashboard values. Subscription access rule for pharmacists and public listing rule. Duty periods with overlap and midnight rules; on-duty-now calculation. Public search and directory returning public fields only.

7 / 9


<!-- Page 8 -->

All screens in section 10 with loading, empty and error states. Validation, HTTP errors, Logger, Swagger and seed data as described in section 12.

# 15. STRETCH (optional)

FEFO suggestion: for a medicine, suggest the earliest-expiring batch that is not expired and has stock. Stock adjustments with history: change a batch quantity with a reason; store each adjustment (who, when, old and new quantity, reason) together with the quantity change in one transaction, and show a recent-activity feed on the dashboard. Arabic interface: right-to-left Arabic labels while keeping scientific names and batch numbers readable. Owner overview: counts of pharmacies per subscription status and subscriptions ending in the next 30 days.

# 16. CHALLENGE (optional, harder)

Dispensing with FEFO: record dispensing of a quantity of a medicine that automatically takes stock from the earliest-expiring eligible batches (possibly several), all in one transaction. Configurable expiry window per pharmacy: each pharmacy chooses its own expiring-soon window, and every calculation and filter respects it.

# 17. OUT OF SCOPE

Do not build: payment gateways or automatic subscription billing and invoices; a full point-of-sale or sales system; supplier or purchasing management; barcode scanner hardware; delivery or a marketplace; medicine reservations or ordering; multiple branches per pharmacy; citizen accounts; notifications by SMS, email or push; maps; real-time WebSockets; a contact-support system; public hosting/deployment.

# 18. Presentation Requirements

Your team presents in English. Every member speaks, and any team member may be asked to explain any part of the project — the presentation is not evaluated on the leader alone.

Your presentation must show:

1. the problem and the product idea;

2. the main user flow (owner onboards a pharmacy → pharmacist adds batches → dashboard indicators →

citizen search);

3. frontend behavior, including loading, empty and error states;

4. backend/API behavior in Swagger;

5. the persisted data in PostgreSQL (for example with Prisma Studio or SQL);

6. at least one meaningful business rule, explained in your own words (for example public availability or the

subscription rule);

7. a validation or error case being rejected;

8. your architecture and code organization (controller → service → persistence);

9. one technical or product decision your team made, and why;

10. one limitation of your product, or the next improvement you would make.

# 19. Acceptance Checklist

☐ Only the owner can create pharmacies, pharmacist accounts and subscriptions. ☐ A pharmacist cannot read or change another pharmacy's batch, even with its id.

8 / 9


<!-- Page 9 -->

☐ A pharmacist of an EXPIRED or SUSPENDED pharmacy can view the inventory but every change is rejected with the reason. ☐ Deleting a subscription keeps the pharmacy, its medicines, batches and duty periods; the pharmacy's status becomes NONE. ☐ A batch expiring in 30 days is EXPIRING SOON; one that expired yesterday is EXPIRED; one expiring in 200 days is neither. ☐ A medicine whose non-expired quantity equals its reorder threshold is LOW STOCK. ☐ A medicine that is low in stock and has an expiring-soon batch shows both indicators and appears under both filters. ☐ Dashboard inventory value and expected waste match a hand calculation from the seeded batches. ☐ Public search does not list a pharmacy whose only batches of the medicine are expired or have zero quantity. ☐ Public search does not list a pharmacy whose subscription is not ACTIVE. ☐ Public responses contain no quantity, batch number, cost, storage location or subscription data. ☐ A pharmacy with a 20:00 → 08:00 duty period shows as on duty at 02:00 and not at 09:00. ☐ Overlapping duty periods are rejected. ☐ Data is still there after restarting the backend; Swagger documents every endpoint and its authentication.

# 20. Evaluation Focus

| Area | What we look for |
| --- | --- |
| Functional completeness | The CORE features and screens exist and work. |
| Correct business behavior | Scoping, subscriptions, indicators, duty periods and public availability follow the rules exactly. |
| Backend/API quality | Controller → service → persistence, DTO validation, guards, ownership checks, correct HTTP errors, Swagger, Logger. |
| Database and persistence | A sensible relational model (medicine vs. batch), migrations, seed data. |
| Frontend quality | Clear dashboards and public pages with loading, empty, error and business-rule feedback. |
| Team collaboration and Git | Shared work, visible contributions from every member. |
| Explaining your own work | Every member can explain the product, its rules and its design. |
| Presentation quality | Clear English presentation with a working live demo. |

9 / 9
