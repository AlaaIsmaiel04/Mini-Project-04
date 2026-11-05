# Shared backend helpers

`security.ts` exports Actor/ActorRequest, JwtAuthGuard, Roles/RolesGuard, OwnResource/OwnershipGuard and ActiveSubscriptionGuard. Use JWT then Roles guards; apply subscription checks only to writes. The actor is `{ id, email, role, pharmacyId }`, loaded from the current Account row. HTTP examples and handoff notes: [Mustafa implementation](../../../../docs/MUSTAFA-IMPLEMENTATION.md).

`business-date.ts` handles Asia/Amman calendar days and strict date parsing. `subscription-status.ts` reuses Shiam's helper from the supplied guide. `inventory-calculations.ts` extends Mohammad's pure helper, preserving calculateDashboard and sharing batch/medicine indicators. `inventory-mapper.ts` adapts Prisma records to the approved wire contract. Feature services remain in their modules.
