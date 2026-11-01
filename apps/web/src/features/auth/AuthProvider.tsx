import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ApiError,
  LoginInput,
  LoginResponse,
  SessionUser,
} from '@smartshelf/contracts';

interface AuthContextValue {
  user: SessionUser | null;
  accessToken: string | null;
  signIn: (input: LoginInput) => Promise<SessionUser>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(null);

  async function signIn(input: LoginInput): Promise<SessionUser> {
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
      /\/$/,
      '',
    );

    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => null)) as ApiError | null;

      const message = Array.isArray(error?.message)
        ? error.message.join(' ')
        : error?.message;

      throw new Error(
        response.status === 404
          ? 'The sign-in API is not available yet.'
          : message || 'Unable to sign in. Please try again.',
      );
    }

    const result = (await response.json()) as LoginResponse;

    if (
      !result.accessToken ||
      !result.user ||
      !['OWNER', 'PHARMACIST'].includes(result.user.role)
    ) {
      throw new Error('The server returned an invalid sign-in response.');
    }

    setSession(result);
    return result.user;
  }

  function signOut() {
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
