import { useLanguage } from './LanguageProvider';

export function LanguageControl() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-control">
      <span className="visually-hidden">{t('Language')}</span>
      <select
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value === 'ar' ? 'ar' : 'en')
        }
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="ar" lang="ar">
          العربية
        </option>
      </select>
    </label>
  );
}
