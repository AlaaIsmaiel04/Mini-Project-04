# Notes for the final PR

Changes outside Hamid's folders that other members should make. Nothing here has been changed by Hamid. Send this with the final PR.

## Alaa

- [ ] **`scripts/test-integration.mjs`: add one line.** Add `'src/modules/public/public.integration.spec.ts',` to the spec list. The runner uses a fixed list, so until then CI and `npm run test:integration` skip the public PostgreSQL tests. `npm test` finds the file but skips it, because it has no database.
- [ ] **`README.md`:** lines 9, 36 and 92 still say public medicine search can return 503. It is now live.
- [ ] **`docs/YOUSEF-PROGRESS.md`:** the Day 8-9 row and the closing note say search returns 503 and needs Hamid's adapter. Yousef's "Manual acceptance" steps can now be run against the real API.
- [ ] **`docs/ALAA-PROGRESS.md`:** line 53 still lists Hamid's temporary adapters as pending.
- [ ] **`docs/API-CONTRACT.md`:** line 5 still says only `/health` is implemented.
- [ ] **`docs/LOCAL-SETUP.md`:** line 51 says "Hamid's live persistence/guard adapters still need team integration" and that public search is not complete. Both are done, apart from Shiam's owner endpoints.
- [ ] **`.prettierrc.json`:** on Windows with `core.autocrlf=true`, `npm run format:check` flags about 119 files for line endings alone. `"endOfLine": "auto"`, or a `.gitattributes` with `* text=auto eol=lf`, would stop this.
- [ ] **`scripts/smoke.mjs`:** checks the auth and inventory routes in Swagger but none of Hamid's. Add `/api/pharmacist/profile`, `/api/pharmacist/duty-periods`, `/api/public/pharmacies` and `/api/public/medicines`.
- [ ] **`apps/web/src/features/pharmacy/duty-time.ts` (Mohammad's page):** `datetime-local` values use the device's time zone. It is labelled and sends correct UTC, but a device outside Jordan enters times in its own zone. Decide whether duty times should always be entered in Jordan time.

## Mustafa

- [ ] **`apps/api/prisma/seed.ts`: add a second ACTIVE pharmacy in the South area.** Today only Demo Pharmacy 1 is ACTIVE, so the area filter has nothing to compare in a demo.
- [ ] **`apps/api/prisma/seed.ts`: duty dates.** The overnight period is dated from the first seed run and is not refreshed, so a rehearsal needs a fresh database.
- [ ] **Migration: add an index on `DutyPeriod (pharmacyId, endsAt)`.** The overlap check and the public listing filter on `endsAt`; the current index is on `startsAt`.
- [ ] **Migration, optional: a database overlap constraint.** The migration's last comment says overlap prevention is in Hamid's code, and it is, through a row lock in `DutyPeriodStore.transaction`. A write that bypasses that method is not protected. An `EXCLUDE USING gist` constraint with `btree_gist` would close this.
- [ ] **`docs/MUSTAFA-IMPLEMENTATION.md`:** line 89 still names `TemporaryPharmacistGuard` and says it rejects requests. It is now `JwtPharmacistGuard` and uses `JwtAuthGuard`.

## Shiam

- [ ] **Owner module is still empty.** `DELETE /owner/pharmacies/:id/subscription` must remove only the subscription (R-7). Hamid's tests change subscription rows directly until then. Tell Hamid when it merges, so A06 can be tested through the real endpoint.
- [ ] **Reuse `common/subscription-status.ts`** for the owner list, so owner and public views cannot disagree.
