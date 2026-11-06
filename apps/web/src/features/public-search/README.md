# Public medicine search

Implemented at `/search` with `PublicSearchPage`, `PharmacyCard` and `public-api.ts`.
Requests are unauthenticated. Submit a nonempty display/scientific name with optional
area and on-duty filters. Typing alone does not request results. Retry repeats the
submitted filters; Clear resets inputs/results. Aborted or superseded requests
cannot replace newer results. Loading, error, initial and no-match states are explicit.

Cards use a runtime public allowlist, Jordan duty times, safe phone links and null
time messages. They never render quantities, costs, identifiers or private fields.
All labels use the shared English/Arabic provider. Styles inherit SmartShelf tokens.
No production fixtures or fallback results are supplied.

The directory reuses the same view and cards. See `docs/YOUSEF-PROGRESS.md` for
verification, remaining backend dependency and the English presentation script.
