import { LoaderCircle, RefreshCw } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { accountRouteElement } from '@/features/account/account-routes';
import { useAccountRoutes } from '@/features/account/context/account-routes-context';

export function AccountRouteContent() {
  const { t } = useTranslation();
  const location = useLocation();
  const { retry, state } = useAccountRoutes();

  if (state.status === 'loading' || state.status === 'inactive') {
    return (
      <AccountRouteStatus>
        <LoaderCircle aria-hidden="true" className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          {t('pages.account.routeAccessState.loading')}
        </p>
      </AccountRouteStatus>
    );
  }

  if (state.status === 'error') {
    return (
      <AccountRouteStatus>
        <strong className="text-sm">{t('pages.account.routeAccessState.error')}</strong>
        <Button className="mt-4" onClick={retry} variant="outline">
          <RefreshCw aria-hidden="true" className="size-4" />
          {t('pages.account.routeAccessState.retry')}
        </Button>
      </AccountRouteStatus>
    );
  }

  const currentRoute = state.routes.find((route) => route.path === location.pathname);
  const element = currentRoute ? accountRouteElement(currentRoute.routeKey) : undefined;

  if (element) {
    return element;
  }

  const fallbackRoute = state.routes.find((route) => accountRouteElement(route.routeKey));
  return <Navigate replace to={fallbackRoute?.path ?? '/models'} />;
}

function AccountRouteStatus({ children }: { children: React.ReactNode }) {
  return (
    <Card className="grid min-h-56 place-items-center p-7 text-center shadow-sm">
      <div>{children}</div>
    </Card>
  );
}
