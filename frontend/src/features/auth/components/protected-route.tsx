import { LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/context/auth-context';

export function ProtectedRoute({ renderOutletWhileLoading = false }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { retry, state } = useAuth();

  if (state.status === 'guest') {
    const from = `${location.pathname}${location.search}${location.hash}`;

    return <Navigate replace state={{ from }} to="/login" />;
  }

  if (state.status === 'loading') {
    if (renderOutletWhileLoading) {
      return <Outlet />;
    }

    return (
      <RouteStatus>
        <LoaderCircle aria-hidden="true" className="mx-auto size-7 animate-spin text-primary" />
        <p className="mt-4 text-xs text-muted-foreground">{t('auth.session.checking')}</p>
      </RouteStatus>
    );
  }

  if (state.status === 'error') {
    return (
      <RouteStatus>
        <p className="text-sm font-semibold">{t('auth.session.loadError')}</p>
        <Button className="mt-5" variant="outline" onClick={retry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          {t('auth.session.retry')}
        </Button>
      </RouteStatus>
    );
  }

  return <Outlet />;
}

interface ProtectedRouteProps {
  renderOutletWhileLoading?: boolean;
}

function RouteStatus({ children }: { children: ReactNode }) {
  return (
    <section className="relative z-10 grid min-h-[calc(100vh-188px)] place-items-center px-4 py-14">
      <div className="hero-grid absolute inset-0 -z-10 opacity-45" aria-hidden="true" />
      <Card className="w-full max-w-sm gap-0 p-7 text-center shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text)_7%,transparent)]">
        {children}
      </Card>
    </section>
  );
}
