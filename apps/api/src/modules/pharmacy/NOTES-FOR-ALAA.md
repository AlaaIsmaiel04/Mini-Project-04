# Notes for the final PR

Changes outside Hamid's folders that other members should make. Nothing here has been changed by Hamid. Send this with the final PR.

## Alaa

- [ ] **`scripts/test-integration.mjs`: add one line.** Add `'src/modules/public/public.integration.spec.ts',` to the spec list. The runner uses a fixed list, so until then CI and `npm run test:integration` skip the public PostgreSQL tests. `npm test` finds the file but skips it, because it has no database.
- [ ] **`README.md`:** lines 9, 36 and 92 still say public medicine search can return 503. It is now live.
- [ ] **`docs/YOUSEF-PROGRESS.md`:** the Day 8-9 row and the closing note say search returns 503 and needs Hamid's adapter. Yousef's "Manual acceptance" steps can now be run against the real API.
- [ ] **`docs/ALAA-PROGRESS.md`:** line 53 still lists Hamid's temporary adapters as pending.
- [ ] **`docs/API-CONTRACT.md`:** line 5 still says only `/health` is implemented. The conventions on line 19 also list no 500, though an unexpected failure such as a database outage answers `{statusCode: 500, message: 'Internal server error'}`. Hamid's guides and Swagger now document it; the contract and any frontend error handling should agree.
- [ ] **`docs/LOCAL-SETUP.md`:** line 51 says "Hamid's live persistence/guard adapters still need team integration" and that public search is not complete. Both are done, apart from Shiam's owner endpoints.
- [ ] **`.prettierrc.json`:** on Windows with `core.autocrlf=true`, `npm run format:check` flags about 119 files for line endings alone. `"endOfLine": "auto"`, or a `.gitattributes` with `* text=auto eol=lf`, would stop this.
- [ ] **`scripts/smoke.mjs`:** checks the auth and inventory routes in Swagger but none of Hamid's. Add `/api/pharmacist/profile`, `/api/pharmacist/duty-periods`, `/api/public/pharmacies` and `/api/public/medicines`.
- [ ] **`apps/web/src/features/pharmacy/duty-time.ts` (Mohammad's page):** `datetime-local` values use the device's time zone. It is labelled and sends correct UTC, but a device outside Jordan enters times in its own zone. Decide whether duty times should always be entered in Jordan time.

### Mount the dark theme (Hamid's Day 10 and 12)

The theme is finished but nothing shows until these lines are in Alaa's files. Nothing else needs changing, and the light theme looks the same as today.

- [ ] **`apps/web/index.html`:** add the `<script>` straight after the `theme-color` meta tag. It must be inline in `<head>` so the theme is set before the first paint, which a module script is too late for. A test in `theme.test.ts` fails if it ever differs from `THEME_BOOT_SCRIPT` in `features/preferences/theme.ts`.
- [ ] **`apps/web/src/main.tsx`:** import `theme.css` after `refresh.css`, apply the theme beside `applyDocumentLanguage`, and wrap with `ThemeProvider` inside `LanguageProvider`.
- [ ] **`apps/web/src/components/AppShell.tsx`:** add `<ThemeControl />` straight after both `<LanguageControl />` lines.

These are the exact lines. Save the block as `theme.diff` and run `git apply --ignore-whitespace theme.diff` from the repository root, or copy them by hand:

```diff
--- a/apps/web/index.html
+++ b/apps/web/index.html
@@ -1,2 +1,2 @@
 <!doctype html>
-<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#176b53"/><title>SmartShelf</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
+<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#176b53"/><script>(function(){var t;try{t=localStorage.getItem('smartshelf.theme')}catch(e){}if(t!=='light'&&t!=='dark'){try{t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){t='light'}}document.documentElement.dataset.theme=t})()</script><title>SmartShelf</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
--- a/apps/web/src/main.tsx
+++ b/apps/web/src/main.tsx
@@ -5,19 +5,29 @@ import { App } from './app/App';
 import { AuthProvider } from './features/auth/AuthProvider';
 import './styles.css';
 import './refresh.css';
+import './theme.css';
 import { LanguageProvider } from './features/preferences/LanguageProvider';
+import { ThemeProvider } from './features/preferences/ThemeProvider';
+import {
+  applyDocumentTheme,
+  readThemePreference,
+  resolveTheme,
+} from './features/preferences/theme';
 import { applyDocumentLanguage, readLanguage } from './locales/messages';
 
 // Apply saved direction before React paints the first frame.
 applyDocumentLanguage(readLanguage());
+applyDocumentTheme(resolveTheme(readThemePreference()));
 
 createRoot(document.getElementById('root')!).render(
   <StrictMode>
     <BrowserRouter>
       <LanguageProvider>
-        <AuthProvider>
-          <App />
-        </AuthProvider>
+        <ThemeProvider>
+          <AuthProvider>
+            <App />
+          </AuthProvider>
+        </ThemeProvider>
       </LanguageProvider>
     </BrowserRouter>
   </StrictMode>,
--- a/apps/web/src/components/AppShell.tsx
+++ b/apps/web/src/components/AppShell.tsx
@@ -4,6 +4,7 @@ import type { ReactNode } from 'react';
 import { Link, NavLink, useLocation } from 'react-router-dom';
 import { useAuth } from '../features/auth/AuthProvider';
 import { LanguageControl } from '../features/preferences/LanguageControl';
+import { ThemeControl } from '../features/preferences/ThemeControl';
 import { InterfaceIcon } from './InterfaceIcon';
 
 export function Brand() {
@@ -194,11 +195,13 @@ export function AppShell({ children }: { children: ReactNode }) {
                 {owner ? t('Platform management') : t('Pharmacy workspace')}
               </span>
               <LanguageControl />
+              <ThemeControl />
             </>
           ) : (
             <>
               <Brand />
               <LanguageControl />
+              <ThemeControl />
               <nav aria-label={t('Main navigation')}>
                 <ul>{navigation}</ul>
               </nav>
```

After mounting, these become out of date:

- [ ] **`apps/web/src/features/preferences/README.md`:** line 11 says the dark theme is not implemented. It uses `ThemeProvider`, `ThemeControl` and `theme.ts`, saved as `smartshelf.theme`.
- [ ] **`README.md`:** line 9 lists dark mode as remaining work.
- [ ] **`docs/LANGUAGE.md` and `docs/YOUSEF-PROGRESS.md`:** both say dark mode is separate or not implemented.

Found while checking the theme, in the light theme only and not caused by it:

- [ ] **`apps/web/src/refresh.css`, line 10:** form control borders use `--border` at about 1.2:1 against the page and 1.3:1 against a card. WCAG asks for 3:1 on control boundaries. All text in the light theme passes. The dark theme already uses a stronger border for controls.

## Mustafa

- [ ] **`apps/api/prisma/seed.ts`: add a second ACTIVE pharmacy in the South area.** Today only Demo Pharmacy 1 is ACTIVE, so the area filter has nothing to compare in a demo.
- [ ] **`apps/api/prisma/seed.ts`: duty dates.** The overnight period is dated from the first seed run and is not refreshed, so a rehearsal needs a fresh database.
- [ ] **Migration: add an index on `DutyPeriod (pharmacyId, endsAt)`.** The overlap check and the public listing filter on `endsAt`; the current index is on `startsAt`.
- [ ] **Migration, optional: a database overlap constraint.** The migration's last comment says overlap prevention is in Hamid's code, and it is, through a row lock in `DutyPeriodStore.transaction`. A write that bypasses that method is not protected. An `EXCLUDE USING gist` constraint with `btree_gist` would close this.
- [ ] **`docs/MUSTAFA-IMPLEMENTATION.md`:** line 89 still names `TemporaryPharmacistGuard` and says it rejects requests. It is now `JwtPharmacistGuard` and uses `JwtAuthGuard`.

## Shiam

- [ ] **Owner module is still empty.** `DELETE /owner/pharmacies/:id/subscription` must remove only the subscription (R-7). Hamid's tests change subscription rows directly until then. Tell Hamid when it merges, so A06 can be tested through the real endpoint.
- [ ] **Reuse `common/subscription-status.ts`** for the owner list, so owner and public views cannot disagree.
