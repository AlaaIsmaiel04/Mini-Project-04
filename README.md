# SmartShelf

Pharmacy Management & Public Medicine Search - Weekly Mini Project 04, Team 2.

## Foundation only

This repository supplies the development setup so the six members can build the project themselves. The frontend shows one plain startup message. The backend exposes only process health and Swagger. Feature folders contain ownership notes and empty NestJS module declarations.

Included: React/TypeScript/Vite and NestJS configuration, installed dependencies and lockfile, dev/build commands, environment examples, optional PostgreSQL Compose configuration, an empty Prisma datasource/generator, an empty shared-types package, and the work plan.

The members implement all product pages, styling, routing, forms, API requests, test data, authentication/guards, database models/migrations/seed, business calculations, feature services/DTOs and tests. There are no ready-made product screens or prewritten business rules.

## Start locally - PowerShell

Node 24 LTS is recommended (minimum 22.12). From the repository root:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
npm run dev
```

Copy environment files only on first setup; keep your existing local settings on later pulls. Never commit .env files. No database is required to run this empty foundation.

- React foundation: <http://localhost:5173>
- API process health: <http://localhost:3000/api/health>
- Swagger, currently health only: <http://localhost:3000/api/docs>

See [local setup](docs/LOCAL-SETUP.md). Database commands become useful after Mustafa creates the models and initial migration. Seed scripts and accounts must be authored by the team; no demo credentials/data are supplied.

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

- Agree route names, response fields, shared helper signatures and database needs on Day 1. The [API proposal](docs/API-CONTRACT.md) is a planning document; the team writes the actual types and code.
- Frontend members create their own small feature-local fixtures while APIs are in progress. No fixtures or adapters are prebuilt.
- Backend members create their own service tests/fake persistence inputs while shared authentication work proceeds.
- Work mainly in your assigned folders. Alaa coordinates shared frontend/types changes; Mustafa authors migrations.
- Existing branches: alaa, mustafa, hamid, Mohammad, Yousef, Sheam (Shiam). Branch names are case-sensitive conventions, not per-member access restrictions.
- Publish the reviewed foundation through a PR first. Then integrate small PRs into main throughout the two weeks.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npm run smoke
npm run format:check
```

No feature tests exist yet; the test runner says so explicitly until members add .spec.ts files. Smoke checks only verify foundation startup/health and the built frontend. CI does not claim business features are implemented.

## Scope and requirements

[The final teacher specification](docs/PROJECT-SPECIFICATION.md) is the source of requirements. [Acceptance scenarios](docs/ACCEPTANCE.md) describe what members must implement and prove.

React + TypeScript, NestJS, PostgreSQL/Prisma, JWT and Swagger. Prisma/client are both pinned to 6.19.0. Local demo only; no hosting, payments, ordering, reservations, citizen accounts, maps, external AI or notifications. Arabic/RTL is optional instructor scope and follows CORE. Every member contributes and speaks in the English presentation.
