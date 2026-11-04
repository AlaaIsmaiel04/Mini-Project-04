import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  applyDocumentLanguage,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  translate,
} from '../../locales/messages';
import type {
  Language,
  MessageKey,
  MessageParams,
  MessageValue,
} from '../../locales/messages';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  // Preserve unknown server messages instead of hiding useful error details.
  translateMessage: (message: MessageValue) => string;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(readLanguage);
  useLayoutEffect(() => applyDocumentLanguage(language), [language]);
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage(next) {
        updateLanguage(next);
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
          // Language switching still works when browser storage is unavailable.
        }
      },
      t: (key, params) => translate(language, key, params),
      translateMessage: (message) =>
        typeof message === 'string'
          ? translate(language, message)
          : translate(language, message.key, message.params),
    }),
    [language],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage requires LanguageProvider.');
  return value;
}
