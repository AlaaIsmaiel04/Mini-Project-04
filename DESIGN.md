# SmartShelf interface

## Source and scope

Adapted from [SmartShelf Complete UI/UX](https://www.figma.com/design/08Fxp25B9QPT0iFPfSamGN/SmartShelf-Complete-UI-UX?node-id=5-5). The saved screen exports and handoff in `output/design/` were used with Alaa's approval because the live Figma connector was rate-limited. The initial English adaptation was approved; Alaa subsequently authorized the Day 11 English/Arabic language foundation and RTL layout. This is a responsive adaptation, not a claim of pixel-identical Arabic screens.

The shared shell, sign-in, owner pharmacy/account/subscription screens, and medicine/batch screens use this design. Dashboard/profile/duty screens now reuse these tokens and responsive surfaces, with EN/AR labels and feedback. Public search/directory now reuse the same tokens, responsive filters and pharmacy cards; theme remains pending. Shared, sign-in, owner/inventory and pharmacist EN/AR translations and direction are implemented. Public search/directory labels are also translated through the shared provider.

## Shared foundations

- Theme variables live in `apps/web/src/styles.css`: warm cream background, off-white surfaces, deep green text/sidebar, green actions and gold active navigation.
- Cairo is served locally from `apps/web/public/fonts/`; its SIL Open Font License is included there. The exports use Cairo as their Arabic font fallback. No external font request is required.
- Controls use a 12px radius and at least 44px height; panels use a 20px radius. Spacing follows an 8px base.
- Use textual status labels alongside color. Muted/error text is darker than the source swatches for readability.
- Do not invent counts, accounts, currency symbols or successful API responses to match a prototype. Keep development samples explicitly labelled.

## Layout and components

`AppShell` owns role navigation, brand, sidebar, mobile menu, main landmark, skip link and footer. Keep feature behavior inside feature components. The language select is functional through LanguageProvider. Do not add dead controls for unimplemented theme settings.

Desktop workspaces have a 248px sidebar on the left in English and right in Arabic. Navigation collapses behind Menu at 760px; Escape closes it and restores toggle focus. Lists adapt to labelled cards by 1050px, with intermediate column adjustments at 1180px. Forms stack on narrow screens. Login uses two desktop columns and puts the form first on mobile.

Owner styles live in `features/owner/owner.css`; inventory styles live in `features/inventory/inventory.css`. Reuse global tokens and shared control styles rather than creating a separate palette for new screens.

## Behavior and verification

Preserve loading/empty/error/success states, session handling, subscription restrictions, draft preservation and immutable batch fields. Real routes never use preview fixtures as an API fallback. Both preview routes remain development-only.

Browser checks cover 320/390/768/1280/1440px layouts, local font loading, horizontal overflow, mobile menu, skip link and form layouts. Existing owner/inventory/session regression scripts cover functional behavior with fixtures and simulated API responses. These checks do not prove real authentication or PostgreSQL integration.

Language implementation and extension guidance is in `docs/LANGUAGE.md`. Preserve explicit LTR identifiers and medicine names inside the RTL layout.
