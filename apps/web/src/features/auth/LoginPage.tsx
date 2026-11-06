import { useLanguage } from '../preferences/LanguageProvider';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { CareSymbol } from '../../components/InterfaceIcon';

export function LoginPage() {
  const { t, translateMessage } = useLanguage();
  const { user, signIn, sessionNotice } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return (
      <Navigate to={user.role === 'OWNER' ? '/owner' : '/pharmacist'} replace />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await signIn({
        email: email.trim(),
        password,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="login-welcome">
        <h2>{t('Welcome back to SmartShelf.')}</h2>
        <p>{t('One account. A workspace built around your role.')}</p>
      </section>
      <div className="auth-layout">
        <aside className="auth-story">
          <CareSymbol />
          <h2>
            {t('Safer shelves.')}
            <br />
            {t('Clearer decisions.')}
          </h2>
          <p>
            {t(
              'Manage your pharmacy, keep track of stock, and help people find the medicine they need.',
            )}
          </p>
          <small>
            {t(
              'For owners and pharmacists. Public medicine search needs no account.',
            )}
          </small>
        </aside>
        <section className="auth-card">
          <h2>{t('Staff sign in')}</h2>
          <p>{t('Sign in to manage your workspace.')}</p>
          {(sessionNotice || location.state?.signInRequired) && (
            <p role="status">
              {sessionNotice
                ? translateMessage(sessionNotice)
                : t('Please sign in to open your workspace.')}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">
              {t('Email')}
              <input
                id="login-email"
                type="email"
                dir="ltr"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </label>

            <label htmlFor="login-password">
              {t('Password')}
              <input
                id="login-password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {translateMessage(error)}
              </p>
            )}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('Signing in...') : t('Sign in')}
            </button>
          </form>
          <p className="auth-footnote">
            {t(
              'Accounts are created by the platform owner. Contact your owner if you need help signing in.',
            )}
          </p>
        </section>
      </div>
    </>
  );
}
