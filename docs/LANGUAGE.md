# English / Arabic interface

Alaa took over Hamid's Day 11 task at the user's request on 4 November 2026. This work is independent of Mustafa and Shiam's pending APIs. The Figma styling and language changes are delivered together.

## Implemented

- Native, keyboard-accessible language select in the public and workspace headers.
- Persistent English/Arabic preference, safe fallback to English if browser storage is unavailable or contains an invalid value.
- Typed translation keys with English defaults and Arabic copy for navigation, shared shell/footer, sign-in, known sign-in/session messages, existing route placeholders, and the owner/inventory screens and forms.
- Document `lang` and `dir` set on startup and updated before paint on selection. Arabic mirrors the workspace sidebar and direction-aware grids; English restores the original layout.
- Explicit LTR treatment for medicine/scientific names, phone numbers, credentials, batch identifiers, barcodes and wire-format dates/costs. Data is neither translated nor reformatted for API submission.
- Language changes preserve unsaved login/inventory fields. No authentication, role, subscription or API fallback behavior was changed.

## Extend the dictionary

Import `useLanguage` from `features/preferences/LanguageProvider`. Add a literal English key and its Arabic translation to `locales/messages.ts` or `locales/feature-messages.ts`, then render `t('Your message')`. TypeScript catches missing keys. Keep compound sentences together rather than assembling fragments with incompatible Arabic word order. Use complete parameterized messages for counts and sentences containing user data. Arabic counts use a neutral count label; English retains singular/plural wording. Parameter values are isolated for bidirectional text and are never interpreted as HTML.

Use `translateMessage` only for known application messages; unknown server details intentionally remain unchanged. Do not translate user-entered values or drug names. Keep form labels in the selected language while using `dir="ltr"` for identifiers. Use logical CSS properties and direction-aware layouts; do not reverse strings or change stored dates.

## Remaining scope

Owner/inventory labels, forms, help text, statuses, counts, confirmation dialogs, local validation, success feedback and development-preview controls now translate on selection. Messages stored in component state stay in their canonical form so they also translate when the language changes after an error or successful save. Dynamic pharmacy/account success messages store a key and parameters instead of a sentence in the previous language.

User-entered values, pharmacy names/addresses, medicine names/categories and batch data stay exactly as supplied. Unknown server error details remain visible in their original language; a translation cannot safely be invented for an arbitrary backend message. Native browser validation messages follow the browser's own language. Dashboard/profile/duty screens now translate labels, validation and feedback through pharmacist-messages.ts, preserving drafts. Their real API browser flows and RTL layouts passed at 320/390/768/1440px. Public screens and dark mode remain separate work.

## Checks

Eight frontend tests pass, including dictionary/fallback/storage cases. Browser checks cover persisted selection after reload, translated sign-in errors, preserved drafts, blocked storage, LTR fields, a right-hand desktop sidebar, mobile menu/Escape/focus and skip navigation. Arabic login, public placeholders, owner and inventory layouts were checked at 320/390/768/1440px without horizontal overflow. Functional owner/inventory/session regression checks use development fixtures or simulated API responses; real backend acceptance remains pending.

On 5 November 2026, Arabic owner/inventory workflows passed browser checks: search/filter/clear, pharmacy and account creation, date validation, subscription save/suspend/reactivate/delete/cancel, medicine/batch creation and editing, read-only fields, inactive write restrictions, validation feedback, and success/error retranslation after switching. Values and drafts were preserved. Arabic layouts passed at 320/390/768/1280/1440px; the existing English owner/inventory/session regressions also passed. Preview samples and simulated API responses are development evidence, not persisted acceptance results.
