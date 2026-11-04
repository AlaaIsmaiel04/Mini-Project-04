import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  LoginInput,
  LoginResponse,
  SessionUser,
} from '@smartshelf/contracts';
import { createApiClient } from '../../lib/api';

interface AuthContextValue {
  user: SessionUser | null;
  accessToken: string | null;
  signIn: (input: LoginInput) => Promise<SessionUser>;
  signOut: () => void;
  sessionNotice: string;
  invalidateSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const generation = useRef(0);

  const signOut = useCallback(() => {
    generation.current += 1;
    setSession(null);
    setSessionNotice('');
  }, []);

  const expireSession = useCallback(() => {
    generation.current += 1;
    setSession(null);
    setSessionNotice('Your session has expired. Please sign in again.');
  }, []);

  async function signIn(input: LoginInput): Promise<SessionUser> {
    const attempt = ++generation.current;
    const result = await createApiClient()<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (
      !result.accessToken ||
      !result.user ||
      !['OWNER', 'PHARMACIST'].includes(result.user.role)
    ) {
      throw new Error('The server returned an invalid sign-in response.');
    }

    if (attempt !== generation.current)
      throw new Error('Sign-in was cancelled. Please try again.');
    setSessionNotice('');
    setSession(result);
    return result.user;
  }

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const current = generation.current;
    const request = createApiClient(session.accessToken, () => {
      if (!controller.signal.aborted && generation.current === current)
        expireSession();
    });
    const validate = () => {
      request<SessionUser>('/auth/me', { signal: controller.signal })
        .then((user) => {
          if (controller.signal.aborted || generation.current !== current)
            return;
          if (
            !user?.id ||
            !['OWNER', 'PHARMACIST'].includes(user.role) ||
            (user.role === 'PHARMACIST' && !user.pharmacyId)
          ) {
            expireSession();
          } else {
            setSession((previous) => previous && { ...previous, user });
          }
        })
        .catch(() => {
          /* A transient network error does not erase a valid in-memory session. */
        });
    };
    window.addEventListener('focus', validate);
    const timer = window.setInterval(validate, 60_000);
    return () => {
      controller.abort();
      window.removeEventListener('focus', validate);
      window.clearInterval(timer);
    };
  }, [session?.accessToken, expireSession]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        signIn,
        signOut,
        sessionNotice,
        invalidateSession: expireSession,
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
