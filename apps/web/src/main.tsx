import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AuthProvider } from './features/auth/AuthProvider';
import './styles.css';
import './refresh.css';
import './theme.css';
import { LanguageProvider } from './features/preferences/LanguageProvider';
import { ThemeProvider } from './features/preferences/ThemeProvider';
import {
  applyDocumentTheme,
  readThemePreference,
  resolveTheme,
} from './features/preferences/theme';
import { applyDocumentLanguage, readLanguage } from './locales/messages';

// Apply saved direction before React paints the first frame.
applyDocumentLanguage(readLanguage());
applyDocumentTheme(resolveTheme(readThemePreference()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
