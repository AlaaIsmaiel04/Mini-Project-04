# Public search and directory

Hamid: privacy-safe public search and directory.

`PublicService` lists pharmacies with an ACTIVE effective subscription (R-5) and, for a medicine search, one batch with units that has not expired in `BUSINESS_TIME_ZONE` (R-24). `toPublicPharmacy` copies each public field by name, including nested duty periods (R-25).

Stock comes from `PrismaMedicineAvailabilityStore`, pharmacies and duty periods from the Prisma stores in `../pharmacy/adapters`. Text from a request matches literally: `%`, `_` and `\` are not wildcards.

Fixture specs need no database. `public.integration.spec.ts` runs the same routes through the real `AppModule` and PostgreSQL, with the real clock instance frozen for exact date and duty boundaries.
