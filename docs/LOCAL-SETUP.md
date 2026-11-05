# Local setup

Use Node 24 (minimum 22.12), npm, and PostgreSQL. Prisma and its client stay pinned to 6.19.0. There is no Mongoose dependency.

## Mustafa's configured Windows checkout

The project uses a separate PostgreSQL 18 cluster in `.local/postgres`, listening only on `127.0.0.1:55433`. The database is `smartshelf_mustafa_local`. `apps/api/.env` already contains its generated credentials; the previous file is saved at `.local/api.env.before-local-db`. Both are ignored by Git. `.local/admin.env` holds cluster administration credentials; `.local/test.env` points to the separate test database.

The migration and seed are already applied. From the repository root:

```powershell
npm run db:local:start
npm run dev
```

Open <http://localhost:5173/login>, sign in, then open <http://localhost:5173/pharmacist/inventory>. Swagger: <http://localhost:3000/api/docs>. After stopping the app, `npm run db:local:stop` stops this cluster. `npm run db:local:status` shows its status. Restart it with `db:local:start` after a computer restart. These commands default to PostgreSQL 18 in `C:/Program Files/PostgreSQL/18/bin`; set `PG_BIN` if installed elsewhere.

## First setup on another computer

1. Run `npm ci`.
2. Copy `apps/api/.env.example` and `apps/web/.env.example` to their neighboring `.env` files only if those files do not exist.
3. Create a dedicated PostgreSQL database and user; set `DATABASE_URL` accordingly. Alternatively, if port 5432 is free, `docker compose up -d db` starts the supplied local database using the example connection values. The `.local` cluster is machine-local and is not part of the repository.
4. Generate a JWT secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` and put it in `apps/api/.env` as `JWT_SECRET`. Keep `BUSINESS_TIME_ZONE=Asia/Amman`.
5. Run:

```powershell
npm run db:generate
npm run db:deploy
$env:ALLOW_DEMO_SEED = 'true'
npm run db:seed
Remove-Item Env:ALLOW_DEMO_SEED
npm run dev
```

`db:deploy` applies the checked-in migration, including SQL constraints. Other members should use this migration history. `db:migrate` is for authoring subsequent schema changes; no reset is needed for setup.

## Demo accounts

All seed accounts use the local demonstration password `DemoPass123!`.

| Email                       | Role / subscription    |
| --------------------------- | ---------------------- |
| `owner@smartshelf.test`     | OWNER, no pharmacy     |
| `active@smartshelf.test`    | PHARMACIST / ACTIVE    |
| `expired@smartshelf.test`   | PHARMACIST / EXPIRED   |
| `suspended@smartshelf.test` | PHARMACIST / SUSPENDED |
| `none@smartshelf.test`      | PHARMACIST / NONE      |

The seed creates four pharmacies in two areas, 16 medicines, 24 batches (including expired stock and zero quantity), and one overnight duty period. It uses stable IDs and upserts without updates: rerunning preserves existing edits. Dates are relative to the first seed run; reruns do not refresh them. An expired subscription may still sign in and read inventory, but every inventory mutation returns 403.

Owner and dashboard feature APIs and Hamid's live persistence/guard adapters still need team integration. Owner login works; this does not make owner administration or public search complete.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npm run smoke
npm run test:integration
```

Smoke uses ports 3301 and 5317 and does not change records. Integration tests require an existing, separate database named `smartshelf_test` or `smartshelf_test_<suffix>` owned by the test user. They apply migrations, create their own UUID fixtures and clean those fixtures up; they never reset a database. On Mustafa's checkout `.local/test.env` is configured. Elsewhere set `TEST_DATABASE_URL` before running the command. The runner generates a temporary signing secret internally and never falls back to the development database.

React development proxies `/api` to port 3000. Database acceptance exercises Alaa's actual request client against the real server; a browser visual walkthrough is a separate manual check.
