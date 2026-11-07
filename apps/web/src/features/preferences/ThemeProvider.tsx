import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  applyDocumentTheme,
  readSystemTheme,
  readThemePreference,
  saveThemePreference,
  watchSystemTheme,
} from './theme';
import type { Theme, ThemePreference } from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] =
    useState<ThemePreference>(readThemePreference);
  const [systemTheme, updateSystemTheme] = useState<Theme>(readSystemTheme);
  const theme = preference === 'system' ? systemTheme : preference;
  useEffect(() => watchSystemTheme(updateSystemTheme), []);
  useLayoutEffect(() => applyDocumentTheme(theme), [theme]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      setPreference(next) {
        updatePreference(next);
        saveThemePreference(next);
      },
    }),
    [preference, theme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme requires ThemeProvider.');
  return value;
}
