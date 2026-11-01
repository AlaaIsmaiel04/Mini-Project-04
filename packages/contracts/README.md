# Shared API contracts - Day 1 baseline

This package contains shared wire types for authentication, owner/subscription,
inventory, dashboard, profile/duty and public search/directory responses.
Alaa approved these types as team leader on 1 November 2026. API feature behavior is still assigned implementation work.

Import declarations with `import type { LoginInput } from '@smartshelf/contracts'`.
The same package is available to both workspaces. Backend members still define
runtime DTO validation and explicit response mapping; interfaces do not enforce
authorization or remove private fields at runtime.

After changing types, run `npm run build -w @smartshelf/contracts` from the root
to refresh the declarations consumed by other workspaces, then `npm run typecheck`.
The existing development command does not watch this package automatically.

Alaa coordinates shared changes with each API/frontend owner. Approved baseline routes,
field conventions and review status are in docs/API-CONTRACT.md,
docs/FRONTEND-ROUTES.md and docs/DAY-1-AGREEMENTS.md.
