import { createContext, useContext } from 'react';
import type { AuthUser } from '@/features/auth/api/auth';

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error' };

export interface AuthContextValue {
  state: AuthState;
  retry: () => void;
  setAuthenticatedUser: (user: AuthUser) => void;
  setGuest: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
