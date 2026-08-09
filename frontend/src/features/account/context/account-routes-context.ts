import { createContext, useContext } from 'react';
import type { AccountRouteConfig } from '@/features/account/api/account-routes';

export type AccountRoutesState =
  | { status: 'inactive' }
  | { status: 'loading' }
  | { status: 'ready'; routes: AccountRouteConfig[] }
  | { status: 'error' };

export interface AccountRoutesContextValue {
  applyRouteUpdate: (route: AccountRouteConfig) => void;
  retry: () => void;
  state: AccountRoutesState;
}

export const AccountRoutesContext = createContext<AccountRoutesContextValue | undefined>(undefined);

export function useAccountRoutes(): AccountRoutesContextValue {
  const context = useContext(AccountRoutesContext);

  if (!context) {
    throw new Error('useAccountRoutes must be used within AccountRoutesProvider');
  }

  return context;
}
