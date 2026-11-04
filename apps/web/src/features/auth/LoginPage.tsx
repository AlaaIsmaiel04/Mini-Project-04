import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function LoginPage() {
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
    <section className="auth-card">
      <h2>Staff sign in</h2>
      <p>Sign in to manage your workspace.</p>
      {(sessionNotice || location.state?.signInRequired) && (
        <p role="status">
          {sessionNotice || 'Please sign in to open your workspace.'}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">
          Email
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <label htmlFor="login-password">
          Password
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
