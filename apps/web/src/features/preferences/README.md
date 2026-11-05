# Display preferences

Alaa took over Hamid's Day 11 language task with explicit approval on 4 November 2026.

- `LanguageProvider` supplies `language`, `setLanguage`, `t` and `translateMessage`.
- `LanguageControl` is connected to the shared shell on public and workspace routes.
- EN/AR selection is saved as `smartshelf.language` in localStorage. English is the initial default; unavailable/invalid storage does not break the app.
- Document `lang`/`dir` update before paint. Changing language does not remount forms or clear authentication.
- Shared navigation, sign-in, session notices and route placeholders have Arabic copy. Owner/inventory text, forms and feedback are translated too. Future public/profile/dashboard pages must integrate with this same provider.

Hamid's Day 10 dark theme is not implemented by this task. Coordinate future preference and shared CSS changes with Alaa; do not build another language provider.

See `docs/LANGUAGE.md` for integration guidance and verification limits.
