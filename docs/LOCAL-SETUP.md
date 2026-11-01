# Foundation setup

Install Node 24 LTS, npm and Git. Pull the reviewed foundation, then work on your own branch.

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
npm run dev
```

Copy examples once only. No database generation, migration or seed step is needed now: there are no models or seed script yet. The web entry supports the shared layout work; product pages remain assigned to members. API /api/health confirms only that NestJS starts. No product routes, sign-in, accounts, mock-mode behavior or business endpoints are supplied.

## When the database work is ready

Mustafa designs the Prisma schema, adds the Prisma module/service, creates the initial migration and writes the demo seed with instructions. Follow his merged instructions at that point. Set DATABASE_URL in apps/api/.env to your own dedicated local development database. Never reuse or reset an important database.

Docker Desktop is optional. The supplied compose.yaml can start a local PostgreSQL instance with `docker compose up -d db` if port 5432 is available. An installed PostgreSQL server is also fine; create a dedicated database/user and adjust DATABASE_URL. Starting the database does not create project tables or records.

Generation/migrate/deploy/Studio commands are prepared in package.json for use after models/migrations exist. Mustafa adds a seed command when he writes the seed. Other members apply his committed migrations; they should not create competing migration histories.

## Development boundaries

Frontend members author pages, routing, styles, request handling, fixtures and UI states. Backend members author guards, DTOs, services, response mapping, calculations and tests. Dependencies are installed as tools, not completed implementations.

The Vite /api proxy is configured to localhost:3000. Alaa implements the request client and session behavior. Use the Day 1 shared types in packages/contracts approved by Alaa; coordinate later changes with the affected owners. After editing them, run `npm run build -w @smartshelf/contracts` to update declarations before checking consumers.

Run typecheck, test, build and smoke before a PR. With no feature tests yet, npm test prints that none exist; this is not a completed test suite. Smoke validates foundation startup only.
