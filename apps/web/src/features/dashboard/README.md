# Pharmacist dashboard

The protected /pharmacist route fetches Dashboard through dashboard-api.ts and the shared authenticated request client. All metrics are calculated by the backend. DashboardPreview.tsx contains only a historical fixture; production does not import it.

Shows pharmacy name, subscription state, seven metrics and an attention list with simultaneous badges. Supports loading, error/retry, honest empty/zero data, inactive reads and 401 session expiry. Refetches on navigation, window focus and inventory mutation notifications through useInventoryRevision. Aborted/stale requests cannot overwrite current state.

Uses the existing Figma tokens and language provider, with EN/AR and responsive layouts. See docs/MOHAMMAD-IMPLEMENTATION.md for verification.
