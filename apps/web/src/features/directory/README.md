# Public pharmacy directory

Implemented at `/pharmacies` with `DirectoryPage`. Reuses the public search view,
PharmacyCard, styles and request adapter. Loads without authentication or a medicine
query. Area/on-duty filters apply on submit; Clear reloads all active pharmacies.
The directory adapter allowlists its own query fields, even if a caller passes q.

Real PostgreSQL directory integration is checked. Medicine-stock search remains a
separate backend dependency. See `docs/YOUSEF-PROGRESS.md`.
