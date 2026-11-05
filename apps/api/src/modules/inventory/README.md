# Inventory — Mustafa

Implements GET/POST `/api/pharmacist/medicines`, PATCH `/api/pharmacist/medicines/:id`, POST `/api/pharmacist/medicines/:id/batches`, and PATCH `/api/pharmacist/batches/:id`.

JWT/role guards protect every endpoint; identifiers are scoped to the current actor's pharmacy. Inactive subscriptions may read but not write. Every mutation and inventoryUpdatedAt write share one Prisma transaction. DTOs reject unknown fields, immutable batch fields and invalid quantities/costs; the service validates real calendar dates. Display names are normalized for uniqueness within a pharmacy; batch numbers are unique within a medicine.

See [implementation and verification](../../../../../docs/MUSTAFA-IMPLEMENTATION.md) and `src/inventory.integration.spec.ts`.
