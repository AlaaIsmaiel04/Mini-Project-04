# SmartShelf

Pharmacy Management & Public Medicine Search - Weekly Mini Project 04, Team 2.

## Current implementation

The frontend includes shared routing/navigation, staff sign-in requests, owner pharmacy/account/subscription forms, and inventory browsing plus medicine/batch create/edit forms. Real routes send requests using the agreed API contracts. Development-only owner/inventory previews use explicitly synthetic in-memory data and reset on refresh; they never replace failed API responses.

The backend now includes Mustafa's PostgreSQL schema/migration, repeatable demo seed, JWT login/session endpoints, shared role/ownership/subscription guards, and pharmacy-scoped inventory APIs. Mohammad's dashboard now returns all agreed metrics and attention items from the signed-in pharmacy's persisted stock. Profile and duty endpoints use shared JWT authentication and Prisma stores, including database locking for concurrent duty writes. Public medicine search and pharmacy directory screens now provide filters, public-only cards, English/Arabic labels, responsive layouts and retry/empty states. Owner administration, public medicine-stock persistence and dark mode remain team integration work.

The Figma styling and English/Arabic language selector cover the shared shell, sign-in, owner and inventory screens, including forms and feedback. The dashboard/profile/duty pages use the same design and EN/AR controls. See [interface handoff](DESIGN.md), [language guide](docs/LANGUAGE.md), [Alaa's progress](docs/ALAA-PROGRESS.md) and [demo plan](docs/DEMO-REHEARSAL.md). Development previews never replace real API failures.

## Start locally - PowerShell

Use Node 24 LTS (minimum 22.12), npm and PostgreSQL. On first setup run `npm ci`, then copy `apps/api/.env.example` and `apps/web/.env.example` to neighboring `.env` files only if they do not already exist. Preserve existing local settings; never commit environment files.

Create a dedicated local PostgreSQL database and set `DATABASE_URL` in `apps/api/.env`. Generate a random JWT secret of at least 32 characters and replace the example `JWT_SECRET`. Keep `BUSINESS_TIME_ZONE=Asia/Amman`. Then run:

```powershell
npm run db:generate
npm run db:deploy
$env:ALLOW_DEMO_SEED = 'true'
npm run db:seed
Remove-Item Env:ALLOW_DEMO_SEED
npm run dev
```

Seed only a dedicated demo database. It creates owner/pharmacist demo accounts, four pharmacies, sixteen medicines, twenty-four batches and an overnight duty period. Re-running preserves existing records and edits. Account details and complete setup instructions are in [LOCAL-SETUP.md](docs/LOCAL-SETUP.md). The backend now requires a working database and configured JWT secret at startup.

- React frontend: <http://localhost:5173>
- Synthetic owner preview (development only): <http://localhost:5173/dev/owner>
- Synthetic inventory/forms preview (development only): <http://localhost:5173/dev/inventory>
- API health: <http://localhost:3000/api/health>
- Swagger, including authentication, inventory and Hamid's routes: <http://localhost:3000/api/docs>

`POST /api/auth/login` and `GET /api/auth/me` use the real database. Inventory requests use shared authentication and pharmacy scoping. The dashboard and profile/duty pages at `/pharmacist` and `/pharmacist/profile` use real API data. Profile and duty writes require an active subscription; inactive users retain read access. Public medicine searches can still return 503 until stock persistence is integrated. Owner login alone does not implement owner administration.

The optional `db:local:start/stop/status` commands only work on a checkout with its own configured `.local/postgres` cluster. Mustafa's machine-local database, credentials and test configuration are not supplied by cloning the repository.

## Team responsibilities

| Member           | Assignment                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Mustafa Al Shaar | Backend: database design/migrations/seed, Prisma integration, JWT/guards and inventory API    |
| Shiam Ezzo       | Backend: owner pharmacy/account onboarding, subscriptions and effective-status helper         |
| Hamid Al Haj     | Mostly backend: profile/duty/public APIs; small theme and language task after CORE            |
| Mohammad Kashmar | About 60% backend: indicators/dashboard; 40% frontend: dashboard/profile/duty screens         |
| Yousef Yousef    | Simpler frontend: public search, directory and pharmacy cards                                 |
| Alaa Ismaiel     | Remaining frontend: routing/shell/shared UI, sign-in, owner/inventory screens and integration |

Each member builds their area from scratch. The [team plan](docs/TEAM-PLAN.md) and [individual guides](docs/tasks) cover relative Day 1-14. The six updated PDFs are in [output/pdf](output/pdf).

## Work independently

- Use the approved [API contract baseline](docs/API-CONTRACT.md) and shared wire types. Coordinate changes to response fields, helper signatures and database needs with the affected members.
- Frontend members maintain feature-local fixtures while APIs are in progress. The current owner/inventory previews use member-authored synthetic data; real routes never fall back to it.
- Backend members create their own service tests/fake persistence inputs while shared authentication work proceeds.
- Work mainly in your assigned folders. Alaa coordinates shared frontend/types changes; Mustafa authors migrations.
- Team branches include alaa, mustafa, hamid, hamid-final, Mohammad, Yousef and Sheam (Shiam). Branch names are case-sensitive conventions, not per-member access restrictions.
- Publish the reviewed foundation through a PR first. Then integrate small PRs into main throughout the two weeks.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npm run smoke
npm run format:check
```

The reviewed combined backend/frontend has 435 API tests passing (the PostgreSQL acceptance group is skipped in ordinary `npm test`) and eleven frontend tests. Run the database acceptance separately:

```powershell
npm run test:integration
```

Set `TEST_DATABASE_URL` to a separate database named `smartshelf_test` or `smartshelf_test_<suffix>`. The runner applies migrations and cleans up its own test fixtures; it never falls back to the development database. Sixteen PostgreSQL/HTTP acceptance tests passed during review, covering authentication, ownership, inactive reads/write restrictions, validation, atomic rollback, API restart persistence and Alaa's request client. Fresh migration, repeat seed, typecheck, build and smoke checks also passed. Smoke now requires a configured database. Dashboard/profile/duty acceptance also covers exact totals, empty/inactive reads, real saves, UTC conversion, overlap rejection and concurrent writes across two API instances. See [Mohammad implementation notes](docs/MOHAMMAD-IMPLEMENTATION.md). Full owner-to-public acceptance still needs team integration. Security rejection logs include only reason codes and relevant IDs, never request bodies, credentials or tokens.

## Scope and requirements

[The final teacher specification](docs/PROJECT-SPECIFICATION.md) is the source of requirements. [Acceptance scenarios](docs/ACCEPTANCE.md) describe what members must implement and prove.

React + TypeScript, NestJS, PostgreSQL/Prisma, JWT and Swagger. Prisma/client are both pinned to 6.19.0. Local demo only; no hosting, payments, ordering, reservations, citizen accounts, maps, external AI or notifications. Arabic/RTL is optional instructor scope and follows CORE. Every member contributes and speaks in the English presentation.

## Day 1 agreements

Shared types, browser routes and database needs are prepared and approved by Alaa as team leader. See [DAY-1-AGREEMENTS.md](docs/DAY-1-AGREEMENTS.md) for the review checklist and [FRONTEND-ROUTES.md](docs/FRONTEND-ROUTES.md) for browser paths. This records Alaa's approval of the baseline, not individual member confirmations. Coordinate later changes with the affected owners. No feature API or business logic is added by this contract work.

Public frontend verification and remaining dependencies: [Yousef progress](docs/YOUSEF-PROGRESS.md).
