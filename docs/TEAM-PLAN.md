# Two-week team plan - members build the features

Day 1 starts when the reviewed foundation is shared. These are relative days, not an instructor deadline. Confirm working hours together. Days 7/14 are review/buffer days; move them to fit availability.

## Responsibilities

| Member   | Main focus                        | Builds from scratch                                                               |
| -------- | --------------------------------- | --------------------------------------------------------------------------------- |
| Mustafa  | Backend                           | Schema/migrations/seed, Prisma integration, JWT/guards, medicines/batches API     |
| Shiam    | Focused backend                   | Owner pharmacies/accounts, subscriptions and effective-status helper              |
| Hamid    | Mostly backend, tiny frontend     | Profile/duty/public APIs; theme/language controls after CORE                      |
| Mohammad | ~60% backend / ~40% frontend      | Shared indicator/value calculations, dashboard API, dashboard/profile/duty UI     |
| Yousef   | Simpler frontend                  | Citizen search/directory pages and public pharmacy cards                          |
| Alaa     | Remaining frontend + coordination | Shared routing/layout/styles/components, sign-in, owner/inventory UI, integration |

The repository contains configuration and empty work areas only. No product screens, components, forms, adapters, fixtures, schema models, seed records, guards or business helpers are supplied. Members own design and implementation, not just finishing generated features.

## Reduce dependencies

1. Day 1: agree database fields, route names, request/response shapes and shared function signatures. The API proposal is documentation, not prewritten code. The team authors wire types in packages/contracts.
2. Frontend members create small local fixtures themselves while backend endpoints are in progress. Use them only for development; final acceptance uses real persisted data.
3. Backend members test services/functions with their own fake inputs and explicit test dates rather than waiting for completed controllers or sign-in.
4. Keep changes in owned folders. Mustafa authors database migrations; Alaa coordinates shared frontend/types/root configuration changes. Review before changing shared files.
5. Small PRs and daily integration. Full independence is impossible for a shared application; make the few shared interfaces predictable rather than duplicating authentication/calculations.

## Milestones

| When      | Result                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| Day 1     | Foundation PR merged; ownership and proposed interfaces agreed; members start their own implementations             |
| Day 2     | Mohammad's first calculation helper PR; Shiam's first subscription helper PR; Mustafa's schema/Prisma foundation PR |
| Day 2-3   | Mustafa shares auth/guard implementation and usage; other API owners integrate it                                   |
| Day 5     | API owners share example payloads; frontend owners already have their own working layouts/fixtures                  |
| Day 6-7   | Week 1 API and UI PRs reviewed; initial seed and error cases available                                              |
| Day 8     | First complete real-API integration; identify remaining gaps                                                        |
| Day 10    | Owner -> stock -> dashboard -> citizen flow works against PostgreSQL                                                |
| Day 12    | CORE acceptance and startup on another member's laptop                                                              |
| Day 13-14 | Fixes, English rehearsal, every member speaks; final buffer                                                         |

## Definition of done

- Contributor implemented and can explain their assigned feature.
- Backend: validated bodies/queries/IDs, role/ownership/subscription enforcement, clear errors, public allowlist, Swagger and meaningful tests.
- Frontend: member-authored screens and requests with loading/empty/error/success and validation feedback; no developer-only notes in the final product.
- Integrated behavior uses real API/database data, with no fallback hiding API failures.
- Typecheck/build/startup checks pass; tests are added for implemented rules.
- No .env, node_modules, dist, temporary data or unreviewed schema/dependency changes in commits.

## Scope

Follow the final teacher specification and ACCEPTANCE.md. CORE first. Hamid's small light/dark and Arabic/English task follows backend CORE; Arabic/RTL is optional in instructor scope. No deployment, payments, citizen accounts, orders/reservations, maps or notifications. Defer optional FEFO/history/dispensing/configurable-expiry challenges.

Each guide in docs/tasks assigns all 14 days, handoffs, owned folders, acceptance checks and an English presentation segment. A daily short check-in covers completed work, next result and blockers. Alaa reviews PRs; the assigned contributor keeps responsibility for their own code and fixes.
