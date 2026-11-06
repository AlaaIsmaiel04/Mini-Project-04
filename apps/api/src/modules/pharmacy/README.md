# Profile and duty API

Hamid owns the profile/duty rules and controllers. The integration now binds them to shared JWT authentication, effective subscription status and Prisma persistence. JwtPharmacistGuard delegates authentication to Mustafa's JwtAuthGuard and adds the pharmacist-only rule; it never accepts a supplied actor/header as authentication.

Profile updates allow only area/address/phone. Pharmacy IDs always come from the authenticated account. Inactive subscriptions retain reads and reject writes. Unknown or other-pharmacy duty IDs return the same 404. Existing DTOs, rejection logs and Swagger remain in place.

## Overlap and concurrency

Intervals are half-open [startsAt, endsAt). Adjacent/overnight periods are allowed, editing excludes the period itself, and different pharmacies are independent. End must follow start and duration cannot exceed 24 hours.

Every duty mutation runs through DutyPeriodStore.transaction. PrismaDutyPeriodStore locks the owning Pharmacy row with SELECT FOR UPDATE before reading overlaps, then performs all reads/writes using that transaction's client. This serializes writers across separate API processes. PharmacyLock also queues same-process requests. Profile writes take the same pharmacy lock and recheck subscription status inside the transaction.

The PostgreSQL integration suite starts two independent Nest applications and races matching writes; exactly one succeeds (201), the other returns 409. Fixture tests remain available without a database and fail closed without shared authentication/persistence. The generated INTEGRATION.md shows wire shapes using fixed fixtures, except its 401, owner 403 and 500 examples, which come from the real JWT guard and Prisma stores. Real database evidence is in dashboard-pharmacy.integration.spec.ts and ../public/public.integration.spec.ts.
