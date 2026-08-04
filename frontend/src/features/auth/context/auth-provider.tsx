import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, type AuthUser } from '@/features/auth/api/auth';
import { AuthContext, type AuthState } from '@/features/auth/context/auth-context';
import { readAccessToken } from '@/lib/access-token';
import { ApiError } from '@/lib/api-client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    readAccessToken() ? { status: 'loading' } : { status: 'guest' },
  );
  const [validationVersion, setValidationVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!readAccessToken()) {
      setState({ status: 'guest' });
      return;
    }

    setState({ status: 'loading' });

    void getCurrentUser()
      .then((user) => {
        if (isActive) {
          setState({ status: 'authenticated', user });
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState(
          error instanceof ApiError && error.status === 401
            ? { status: 'guest' }
            : { status: 'error' },
        );
      });

    return () => {
      isActive = false;
    };
  }, [validationVersion]);

  const retry = useCallback(() => {
    setValidationVersion((version) => version + 1);
  }, []);
  const setAuthenticatedUser = useCallback((user: AuthUser) => {
    setState({ status: 'authenticated', user });
  }, []);
  const setGuest = useCallback(() => {
    setState({ status: 'guest' });
  }, []);
  const value = useMemo(
    () => ({ retry, setAuthenticatedUser, setGuest, state }),
    [retry, setAuthenticatedUser, setGuest, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
