# English and Arabic messages

`messages.ts` contains the English message keys/default dictionary and the matching Arabic dictionary, plus language selection and translation helpers. `feature-messages.ts` supplies owner/inventory translations. `messages.test.ts` checks key coverage, fallback behavior and browser-storage failures.

Use `useLanguage().t('English message')` for shared UI copy. Add Arabic copy before using a new key. Keep medicine names, emails, phone numbers, IDs, dates and batch identifiers as data; do not run them through the dictionary. Unknown server messages remain visible unchanged.

See `docs/LANGUAGE.md`. The current dictionaries cover the shared shell, sign-in, route placeholders and owner/inventory screens. Future public/profile/dashboard features still need integration.
