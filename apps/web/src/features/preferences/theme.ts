export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export const THEME_STORAGE_KEY = 'smartshelf.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * index.html runs exactly this before the first paint, because a module script runs too
 * late to prevent a flash. It must give the same answer as resolveTheme(readThemePreference()).
 */
export const THEME_BOOT_SCRIPT = `(function(){var t;try{t=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){try{t=matchMedia('${DARK_QUERY}').matches?'dark':'light'}catch(e){t='light'}}document.documentElement.dataset.theme=t})()`;

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

// System is the default, so nothing is stored for it.
export function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
}

export function readSystemTheme(): Theme {
  try {
    return matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  try {
    const query = matchMedia(DARK_QUERY);
    const listener = (event: MediaQueryListEvent) =>
      onChange(event.matches ? 'dark' : 'light');
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  } catch {
    return () => undefined;
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? readSystemTheme() : preference;
}

export function applyDocumentTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
