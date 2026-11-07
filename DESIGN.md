# SmartShelf interface

## Source and scope

Adapted from [SmartShelf Complete UI/UX](https://www.figma.com/design/08Fxp25B9QPT0iFPfSamGN/SmartShelf-Complete-UI-UX?node-id=5-5). The saved screen exports and handoff in `output/design/` were used with Alaa's approval because the live Figma connector was rate-limited. The initial English adaptation was approved; Alaa subsequently authorized the Day 11 English/Arabic language foundation and RTL layout. This is a responsive adaptation, not a claim of pixel-identical Arabic screens.

The shared shell, sign-in, owner pharmacy/account/subscription screens, and medicine/batch screens use this design. Dashboard/profile/duty screens now reuse these tokens and responsive surfaces, with EN/AR labels and feedback. Public search/directory reuse the same tokens, responsive filters and pharmacy cards. Light/Dark/System is connected across the application; see the 7 November integration update below. Shared, sign-in, owner/inventory and pharmacist EN/AR translations and direction are implemented. Public search/directory labels are also translated through the shared provider.

## Shared foundations

- Base theme variables live in `apps/web/src/styles.css`, with the cream/forest refinement layer in `apps/web/src/refresh.css`: warm cream background, off-white surfaces, deep green text/sidebar, green actions and pale mint active navigation. The gold token remains a restrained secondary accent.
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

## Cream and forest refinement - 6 November 2026

Alaa requested a fresher, simpler, smoother interface while retaining cream and
dark green. This is a refinement of the existing application, preserving content,
routes, forms and backend behavior. Operate mode: the primary task stays obvious.

- Cream canvas, forest-green public heading surfaces, pale mint selection and
  off-white form surfaces. Local Cairo stays the shared English/Arabic typeface.
- Public search pairs a prominent heading with a decorative capsule symbol and
  a raised search form. No stock claims, sample results or unimplemented controls
  were added. Directory and pharmacy cards use the same visual language.
- Shared stroke icons distinguish navigation destinations. Sidebar navigation is
  quieter, left/right aligned with the selected language, with a mint active state.
- Larger staff headings, clearer table headers, 44px minimum staff button targets,
  consistent status labels, and more comfortable login and profile forms.
- A single 420ms arrival animation and short control feedback provide motion;
  reduced-motion users receive neither animation nor transitions.
- The refinement stylesheet is imported after base styles. It owns these visual
  decisions; feature styles continue to own their functional layouts.

Verification: seven pages at 320/390/768/1024/1440 pixels in both languages, local
fonts, no horizontal overflow, menu/Escape/focus, retained medicine drafts during
language switching, and reduced motion. Real isolated pharmacist authentication,
dashboard and profile were checked; owner/inventory form regressions used their
existing development fixtures. Impeccable's detector returned no findings.
Typecheck, production build, smoke, 435 API tests and 14 frontend tests passed.
Screenshots and detailed scope are in `output/refresh/visual-checks.json`.

At this 6 November checkpoint, dark mode and public-stock persistence were still pending. See the 7 November integration update below for the current state; owner administration remains pending.

## Public welcome page - 6 November 2026

At Alaa's request, `/` now introduces SmartShelf with a primary medicine-search
link, a pharmacy-directory row and a staff-sign-in section. Medicine search moved
to `/search`. Brand and Home navigation return to `/`; the not-found recovery
link targets `/search`. Existing role redirects and session guards stay in place.

The welcome page reuses the cream/forest palette, mint action, local Cairo font,
stroke icons, capsule symbol and reduced-motion behavior. English/Arabic copy
uses the shared provider. Four public navigation destinations wrap onto a separate
row on tablet widths to avoid overflow.

Browser verification covers destination links, keyboard submission, search queries,
browser Back, brand/Home navigation, 404 recovery, protected routes, both languages
and 320/390/768/1024/1440 layouts. Public success responses in this check were
controlled test data; the pending public stock adapter is not implemented by this
page. Evidence is in `output/home/browser-checks.json`.

Home motion: one brief arrival draws the capsule outline while it rotates into
place; the small circular marker follows the surrounding ring and settles within
1400ms. The heading reveals over 650ms and supporting copy follows by 80ms. All
three destination links use arrows that move toward their destination on hover
or keyboard focus, mirrored in Arabic. No motion loops and no new library is
required. Reduced motion keeps the complete static artwork and directional arrows,
without entrance animations or spatial feedback. Verification evidence is recorded
in `output/home/motion-checks.json`.

## Connected display preferences - 7 November 2026

Hamid's theme is connected through ThemeProvider and ThemeControl in both application headers. Light retains cream/forest; Dark uses the supplied deep green surfaces with mint controls. System is the default and follows live device changes; manual choices persist independently of language. The inline head script applies the theme before the app module executes. A mandatory test guards its presence and order.

The two selects form one wrapping header group. Mobile workspace headings use their own row so theme/language controls remain reachable. Shared tokens cover home, search, directory, login, owner/inventory and pharmacist pages, with EN/AR direction intact. Theme/language changes preserve form drafts and the in-memory signed-in session. No theme-change animation or new animation dependency is introduced.

Browser evidence in `output/theme/browser-checks.json` covers persistence, System changes, blocked storage, first paint, keyboard/focus, draft/session preservation, rendered text contrast and EN/AR responsive layouts. Owner/account/subscription and stock-form cases use development previews; public search and pharmacist reads use an isolated PostgreSQL database. Real owner onboarding and physical-device/team rehearsal remain pending. Hamid's persisted public stock adapter is now merged.
