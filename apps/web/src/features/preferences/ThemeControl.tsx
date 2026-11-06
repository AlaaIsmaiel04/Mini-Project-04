import { themeLabel } from '../../locales/theme-messages';
import { useLanguage } from './LanguageProvider';
import { useTheme } from './ThemeProvider';
import type { ThemePreference } from './theme';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export function ThemeControl() {
  const { language } = useLanguage();
  const { preference, setPreference } = useTheme();
  return (
    <label className="theme-control">
      <span className="visually-hidden">{themeLabel(language, 'Theme')}</span>
      <select
        aria-label={themeLabel(language, 'Theme')}
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as ThemePreference)
        }
      >
        {PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {themeLabel(language, option)}
          </option>
        ))}
      </select>
    </label>
  );
}
