# Foundation boundaries

## What is present

- npm workspaces, TypeScript configuration and a reproducible dependency lockfile.
- React/Vite entry files; Alaa is building the shared layout. Product feature pages and routing remain assigned work.
- NestJS startup, CORS/validation infrastructure, Swagger and a process-health endpoint.
- Empty feature modules/folders with ownership notes.
- Prisma datasource/generator configuration without models, migrations or seed.
- Day 1 shared API contracts approved by Alaa as team leader; no runtime feature logic.
- Optional local PostgreSQL Compose configuration.
- Work allocation, proposed API routes and requirement/acceptance documents.

## What members build

All product behavior and design: database models, Prisma integration, seed records, authentication, guards, ownership/subscription rules, business calculations, controllers/services/DTOs, public privacy mapping, frontend routing/layout/components/forms, request/session handling, fixtures, UI states, translations/themes and feature tests.

No shared function should be assumed to exist just because a proposal names it. Agree signatures first, then each assigned owner writes and tests their code. Work inside feature folders; coordinate shared types and schema changes.

## Task guides

Assignments are in docs/tasks/assignments.json. Regenerate Markdown/PDF guides with Python after installing scripts/requirements-pdf.txt, using `python scripts/build-task-pdfs.py`. Intermediate render images are ignored under tmp/pdfs. Each member's guide has four pages and relative Day 1-14 tasks.

## References

- [Vite](https://vite.dev/guide/)
- [NestJS](https://docs.nestjs.com/first-steps)
- [NestJS Prisma recipe](https://docs.nestjs.com/recipes/prisma)

Prisma/client are pinned to the same 6.19.0 version for this setup. Do not upgrade dependencies or change the stack independently in feature branches.
