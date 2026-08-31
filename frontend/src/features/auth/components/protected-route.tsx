import { LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resolvePostLoginPath, type AuthLocationState } from '@/features/auth/auth-navigation';
import { useAuth } from '@/features/auth/context/auth-context';

export function ProtectedRoute({ renderOutletWhileLoading = false }: ProtectedRouteProps) {
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

    return <SessionLoading />;
  }

  if (state.status === 'error') {
    return <SessionError onRetry={retry} />;
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const location = useLocation();
  const { retry, state } = useAuth();

  if (state.status === 'loading') {
    return <SessionLoading />;
  }

  if (state.status === 'error') {
    return <SessionError onRetry={retry} />;
  }

  if (state.status === 'authenticated') {
    const requestedPath = (location.state as AuthLocationState | null)?.from;
    return <Navigate replace to={resolvePostLoginPath(requestedPath)} />;
  }

  return <Outlet />;
}

interface ProtectedRouteProps {
  renderOutletWhileLoading?: boolean;
}

function SessionLoading() {
  const { t } = useTranslation();

  return (
    <RouteStatus>
      <LoaderCircle aria-hidden="true" className="mx-auto size-7 animate-spin text-primary" />
      <p className="mt-4 text-xs text-muted-foreground">{t('auth.session.checking')}</p>
    </RouteStatus>
  );
}

function SessionError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <RouteStatus>
      <p className="text-sm font-semibold">{t('auth.session.loadError')}</p>
      <Button className="mt-5" variant="outline" onClick={onRetry}>
        <RefreshCw aria-hidden="true" className="size-4" />
        {t('auth.session.retry')}
      </Button>
    </RouteStatus>
  );
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
