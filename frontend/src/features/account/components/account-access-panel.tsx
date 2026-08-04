import { useState, type ReactNode } from 'react';
import { LoaderCircle, LogOut, UserRoundCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { logout as logoutRequest } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/context/auth-context';

export function AccountAccessPanel() {
  const { t } = useTranslation();
  const { setGuest, state } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logoutRequest();
    } catch {
      // The API client clears the local token even when the server cannot complete logout.
    } finally {
      setGuest();
      setIsLoggingOut(false);
    }
  };

  if (state.status !== 'authenticated') {
    return null;
  }

  return (
    <section className="relative z-10 grid min-h-[calc(100vh-188px)] place-items-center px-4 py-14">
      <div className="hero-grid absolute inset-0 -z-10 opacity-45" aria-hidden="true" />

      <AccountCard>
        <AccountIcon>
          <UserRoundCheck aria-hidden="true" className="size-6" />
        </AccountIcon>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em]">{t('pages.account.title')}</h1>
        <p className="mt-3 text-xs text-muted-foreground">{t('pages.account.signedInAs')}</p>
        <strong className="mt-2 block break-all font-mono text-sm">{state.user.email}</strong>
        <Button
          className="mt-7 min-w-32"
          disabled={isLoggingOut}
          size="lg"
          variant="outline"
          onClick={handleLogout}
        >
          {isLoggingOut ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <LogOut aria-hidden="true" className="size-4" />
          )}
          {t('pages.account.logout')}
        </Button>
      </AccountCard>
    </section>
  );
}

function AccountCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-lg rounded-xl border border-border bg-card p-7 text-center shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text)_7%,transparent)] sm:p-10">
      {children}
    </div>
  );
}

function AccountIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mx-auto grid size-14 place-items-center rounded-xl bg-primary/10 text-primary">
      {children}
    </span>
  );
}
