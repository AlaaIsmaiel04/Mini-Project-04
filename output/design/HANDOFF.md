# SmartShelf UI & UX handoff

[Figma design](https://www.figma.com/design/08Fxp25B9QPT0iFPfSamGN/SmartShelf-Complete-UI-UX?node-id=5-5)

Created 3 November 2026 from the Replit prototype and docs/PROJECT-SPECIFICATION.md. This deliverable does not change application code.

## What is saved in Figma

49 editable UI frames plus a foundations board:
- 9 core desktop views: pharmacist dashboard, inventory, medicine/batches, profile/duty, owner management, subscriptions, public search, directory, and login.
- 12 forms/detail views: medicine create/edit, batch create/edit, pharmacy onboarding, pharmacist account, subscription create, duty create/edit, filters, preferences, and public pharmacy detail.
- 20 feedback and edge states: success, confirmations, validation, duty conflicts, empty/loading/error, no results, invalid login, session expiry, subscription states, 404, access denied, and contact destination.
- 8 mobile views: dashboard, inventory, medicine/batch detail, public search, owner management, profile/duty, login, and navigation.
- Shared color variables, six text styles, reusable status components, and library button instances.

Desktop frames are 1440 px wide; mobile frames are 390 px. Layouts use Auto Layout and editable text. No screenshot of the complete app was imported.

## Verified prototype and visual review

166 cross-screen click links are saved and their destinations were checked in the Figma interaction panel. Four named flow starts are available:

- [Pharmacist](https://www.figma.com/proto/08Fxp25B9QPT0iFPfSamGN/SmartShelf-%E2%80%94-Complete-UI---UX?scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1&starting-point-node-id=5%3A5)
- [Owner](https://www.figma.com/proto/08Fxp25B9QPT0iFPfSamGN/SmartShelf-%E2%80%94-Complete-UI---UX?scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1&starting-point-node-id=5%3A604)
- [Public search](https://www.figma.com/proto/08Fxp25B9QPT0iFPfSamGN/SmartShelf-%E2%80%94-Complete-UI---UX?scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1&starting-point-node-id=5%3A861)
- [Mobile](https://www.figma.com/proto/08Fxp25B9QPT0iFPfSamGN/SmartShelf-%E2%80%94-Complete-UI---UX?scaling=scale-down&content-scaling=fixed&show-proto-sidebar=1&starting-point-node-id=10%3A459)

Presentation smoke tests passed for medicine creation â†’ batch creation â†’ success, owner pharmacy onboarding â†’ account creation, public search â†’ pharmacy details, and mobile menu navigation. All 49 UI frames and the foundations board were visually reviewed. Corrections include the login heading overlap, six full-height sidebars, sample row counts, generic save feedback, and the disabled unfinished English preference.

Mobile frames use 390 Ã— 844 viewports with vertical overflow scrolling. Their content remains editable and extends below the viewport where needed. Final PNG exports are in final-screens/ and SmartShelf-final-screens.zip; mobile-final-review.png shows all eight mobile viewports.

## Prototype boundaries

Forms, filters, authentication, data changes and permissions are illustrative screens and navigation; production code must implement their state and backend behavior. Sample pharmacies share a detail template. Read-only and subscription states illustrate the required behavior; enforce every mutation restriction in the application.

The source uses Noto Kufi Arabic. It was unavailable in the Figma font library, so Cairo is used as an explicit fallback. Production CSS should retain Noto Kufi Arabic. The verified theme is warm light. Full English translation is not included; its preference is disabled and marked coming soon.

## Theme tokens (from rendered prototype)

| Role | Source CSS value |
| --- | --- |
| Background | hsl(43 38% 94%) |
| Surface/card | hsl(44 44% 98%) |
| Foreground | hsl(166 26% 18%) |
| Primary | hsl(164 39% 29%) |
| Sidebar | hsl(164 31% 19%) |
| Gold accent | hsl(42 81% 68%) |
| Muted text | hsl(164 10% 44%) |
| Border | hsl(40 21% 84%) |
| Destructive | hsl(4 61% 49%) |

Controls: 44 px target height; 8 px spacing grid; 12 px control radius; 20 px card radius.
Sample content is illustrative. Currency follows prototype SAR and should be confirmed before implementation.

## Browser routes

| Route | Design frame |
| --- | --- |
| / | 07 â€¢ search |
| /pharmacies | 08 â€¢ directory |
| /login | 09 â€¢ login |
| /owner | 05 â€¢ owner |
| /owner/pharmacies/:pharmacyId/subscription | 06 â€¢ subscription |
| /pharmacist | 01 â€¢ dashboard |
| /pharmacist/inventory | 02 â€¢ inventory / 03 â€¢ detail |
| /pharmacist/profile | 04 â€¢ profile |

## Implementation rules

- Role and pharmacy ownership checks are enforced server-side.
- Public results contain only pharmacy/contact/duty/freshness information; never quantities, batches, costs, storage, subscriptions or account data.
- Only ACTIVE pharmacies appear publicly. Inactive pharmacists can read data but cannot mutate it.
- Medicine available quantity and value exclude expired batches; expected waste includes expired stock above zero.
- Expiring soon means today through the next 90 days. Low stock means available quantity <= reorder threshold. Show simultaneous indicators.
- Batch number, purchase cost and barcode are immutable after creation. Only quantity, expiry and storage can be edited.
- Duty periods may cross midnight, must end after start, last at most 24 hours, and must not overlap.
- Preserve query/filter values on errors. Apply loading, empty and error patterns to every data screen. Recalculate values after successful saves without reload.
- On small screens, replace wide tables with stacked cards; keep actions visible and a clear return path.
- Render telephone numbers as LTR isolated text inside RTL labels and use normalized tel: destinations.
- Keyboard support: logical RTL order, visible focus, Escape dismisses dialogs, return focus to the trigger, and announce save/error/loading changes.
- The Settings language control is an optional extension after CORE; complete English translation is not part of the saved design.

## Verification artifacts

prototype-verification.json records all 166 verified link pairs, four flow URLs, visual checks and smoke-test paths. design-state.json preserves the frame/node ledger. navigation.json is the original 185-link plan: 18 self-links were intentionally omitted and the unfinished English destination was disabled. No development plugin needs to be run.
