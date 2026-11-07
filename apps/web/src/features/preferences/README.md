# Display preferences

Alaa took over Hamid's Day 11 language task with explicit approval on 4 November 2026.

- `LanguageProvider` supplies `language`, `setLanguage`, `t` and `translateMessage`.
- `LanguageControl` is connected to the shared shell on public and workspace routes.
- EN/AR selection is saved as `smartshelf.language` in localStorage. English is the initial default; unavailable/invalid storage does not break the app.
- Document `lang`/`dir` update before paint. Changing language does not remount forms or clear authentication.
- Shared navigation, sign-in, owner/inventory, public, dashboard and profile/duty labels and feedback use the same language provider. User-entered data remains unchanged.

Hamid's theme is connected by Alaa on 7 November 2026. `ThemeProvider` lives inside `LanguageProvider`; `ThemeControl` appears beside `LanguageControl` in both headers. `theme.css` loads after the shared styles. The inline script in `index.html` applies the saved/system choice before paint and is checked against `THEME_BOOT_SCRIPT` in `theme.ts`.

Light/Dark are saved as `smartshelf.theme`; System removes that override and follows live device preference changes. Unavailable storage falls back to System without breaking the app; manual changes still work in memory. Changing either preference preserves forms and authentication. Mobile headers wrap the two controls together. Preserve this shared implementation when extending display preferences.

See `docs/LANGUAGE.md` for integration guidance and verification limits.
