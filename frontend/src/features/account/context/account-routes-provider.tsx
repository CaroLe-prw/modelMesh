import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  listVisibleAccountRoutes,
  type AccountRouteConfig,
} from '@/features/account/api/account-routes';
import {
  AccountRoutesContext,
  type AccountRoutesState,
} from '@/features/account/context/account-routes-context';
import { useAuth } from '@/features/auth/context/auth-context';

export function AccountRoutesProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const [state, setState] = useState<AccountRoutesState>({ status: 'inactive' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (authState.status !== 'authenticated') {
      setState({ status: 'inactive' });
      return;
    }

    setState({ status: 'loading' });
    void listVisibleAccountRoutes()
      .then((routes) => {
        if (isActive) {
          setState({ status: 'ready', routes });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [authState, version]);

  const retry = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);
  const applyRouteUpdate = useCallback(
    (updatedRoute: AccountRouteConfig) => {
      if (authState.status !== 'authenticated') {
        return;
      }

      setState((current) => {
        if (current.status !== 'ready') {
          return current;
        }

        const isVisible = updatedRoute.enabled && updatedRoute.roles.includes(authState.user.role);
        const withoutUpdated = current.routes.filter(
          (route) => route.routeKey !== updatedRoute.routeKey,
        );
        const routes = isVisible ? [...withoutUpdated, updatedRoute] : withoutUpdated;

        routes.sort((left, right) => left.sortOrder - right.sortOrder);
        return { status: 'ready', routes };
      });
    },
    [authState],
  );
  const value = useMemo(
    () => ({ applyRouteUpdate, retry, state }),
    [applyRouteUpdate, retry, state],
  );

  return <AccountRoutesContext.Provider value={value}>{children}</AccountRoutesContext.Provider>;
}
