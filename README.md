# SmartShelf

Pharmacy Management & Public Medicine Search - Weekly Mini Project 04, Team 2.

## Current implementation

The frontend includes shared routing/navigation, staff sign-in requests, owner pharmacy/account/subscription forms, and inventory browsing plus medicine/batch create/edit forms. Real routes send requests using the agreed API contracts. Development-only owner/inventory previews use explicitly synthetic in-memory data and reset on refresh; they never replace failed API responses.

The backend now implements Mustafa's PostgreSQL/Prisma schema, initial migration and repeatable demo seed, JWT login/me, shared guards, and persisted medicine/batch APIs. Authentication and inventory are connected to the existing frontend request client. See [Mustafa's implementation and handoff](docs/MUSTAFA-IMPLEMENTATION.md).

Team integration remains: owner and dashboard modules are empty in this checkout; Hamid's profile/duty/public modules still use their temporary adapters. Their real end-to-end workflows are not claimed complete by this change.

See [Alaa's day-by-day progress and dependencies](docs/ALAA-PROGRESS.md) and the [English demo/rehearsal plan](docs/DEMO-REHEARSAL.md). The Figma layout implementation is deferred until the functional work and team integration are ready. After Hamid's merge, owner flows, inventory forms, focus-based session checks, expiry notices and role redirects passed browser checks using development fixtures or simulated API responses. Real login/inventory request-client acceptance now passes against PostgreSQL; the remaining team workflows still need integration.

## Start locally - PowerShell

Node 24 LTS is recommended (minimum 22.12). From the repository root:

```powershell
npm ci
# First setup only: copy .env.example files if .env does not exist.
# Configure DATABASE_URL and a random JWT_SECRET; start PostgreSQL first.
npm run db:generate
npm run db:deploy
$env:ALLOW_DEMO_SEED = 'true'
npm run db:seed
Remove-Item Env:ALLOW_DEMO_SEED
npm run dev
```

Copy environment files only on first setup; keep your existing local settings on later pulls. Never commit .env files. The API now requires a working PostgreSQL connection. On Mustafa's configured checkout, run `npm run db:local:start` before `npm run dev`; the migration and demo seed are already applied.

- React frontend: <http://localhost:5173>
- Synthetic owner preview (development only): <http://localhost:5173/dev/owner>
- Synthetic inventory/forms preview (development only): <http://localhost:5173/dev/inventory>
- API process health: <http://localhost:3000/api/health>
- Swagger, including authentication and inventory routes: <http://localhost:3000/api/docs>

`GET` and `PATCH /api/pharmacist/profile` are registered but currently return 401 through the temporary authentication guard. This is expected until shared authentication is integrated. Profile Swagger schemas still need the documentation improvements planned for Hamid's Day 7.

See [local setup](docs/LOCAL-SETUP.md) for database setup on another computer. Demo sign-in: `active@smartshelf.test` / `DemoPass123!`; the other seed account states are documented there.

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

`npm test` runs the pure/helper, feature-adapter and frontend request tests. Database acceptance is explicit: run `npm run test:integration` with a dedicated `TEST_DATABASE_URL` (Mustafa's checkout reads its ignored `.local/test.env`). It migrates that test database and verifies real JWT/HTTP requests, scoping, validation, rollback, frontend client compatibility and API restart persistence. `npm run smoke` needs the configured database and checks startup, Swagger routes, authentication protection and built frontend assets. Full owner-to-public acceptance remains a team integration task.

## Scope and requirements

[The final teacher specification](docs/PROJECT-SPECIFICATION.md) is the source of requirements. [Acceptance scenarios](docs/ACCEPTANCE.md) describe what members must implement and prove.

React + TypeScript, NestJS, PostgreSQL/Prisma, JWT and Swagger. Prisma/client are both pinned to 6.19.0. Local demo only; no hosting, payments, ordering, reservations, citizen accounts, maps, external AI or notifications. Arabic/RTL is optional instructor scope and follows CORE. Every member contributes and speaks in the English presentation.

## Day 1 agreements

Shared types, browser routes and database needs are prepared and approved by Alaa as team leader. See [DAY-1-AGREEMENTS.md](docs/DAY-1-AGREEMENTS.md) for the review checklist and [FRONTEND-ROUTES.md](docs/FRONTEND-ROUTES.md) for browser paths. This records Alaa's approval of the baseline, not individual member confirmations. Coordinate later changes with the affected owners. No feature API or business logic is added by this contract work.
