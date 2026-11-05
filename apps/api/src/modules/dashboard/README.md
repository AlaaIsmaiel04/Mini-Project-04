# Pharmacist dashboard

Mohammad owns calculations and GET /api/pharmacist/dashboard. Shared JWT and role guards restrict reads to the authenticated pharmacist's pharmacy; inactive subscriptions may read.

DashboardService reads one repeatable-read snapshot, uses the Asia/Amman business date and the shared inventory calculations, and returns the exact Dashboard contract: real pharmacy name/status, seven metrics, and every attention medicine with all applicable indicators. Money stays Prisma.Decimal until serialization as two-decimal strings. No currency has been chosen.

calculateMedicine preserves the inventory helper's semantics. calculateDashboardDetails adds contract fields while calculateDashboard keeps its existing caller-compatible shape. Batch counts include matching zero-quantity batches; zero quantities contribute no value/waste and do not prevent HEALTHY. LOW_STOCK includes equality. Today through +90 days is EXPIRING_SOON, yesterday is EXPIRED.

Swagger documents the full DTO and authentication/error responses. Pure tests cover boundaries and hand totals; dashboard-pharmacy.integration.spec.ts proves authenticated PostgreSQL reads, empty/inactive access and ownership. See docs/MOHAMMAD-IMPLEMENTATION.md.
