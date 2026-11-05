import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AuthProvider } from './features/auth/AuthProvider';
import './styles.css';
import { LanguageProvider } from './features/preferences/LanguageProvider';
import { applyDocumentLanguage, readLanguage } from './locales/messages';

// Apply saved direction before React paints the first frame.
applyDocumentLanguage(readLanguage());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
