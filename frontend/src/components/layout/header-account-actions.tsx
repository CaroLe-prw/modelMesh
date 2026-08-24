import { ChevronDown, KeyRound, LoaderCircle, LogOut, Store, UserRound } from 'lucide-react';
import { useState } from 'react';
import { SiGithub } from 'react-icons/si';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout as logoutRequest } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/context/auth-context';
import { userDisplayName } from '@/lib/user-display';

export function HeaderAccountActions() {
  const { t } = useTranslation();
  const { setGuest, state } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (state.status === 'loading') {
    return (
      <Button
        aria-label={t('nav.loadingAccount')}
        className="size-10 rounded-full"
        disabled
        size="icon-lg"
        variant="ghost"
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      </Button>
    );
  }

  if (state.status === 'authenticated') {
    const displayName = userDisplayName(state.user.email);

    async function handleLogout() {
      setIsLoggingOut(true);

      try {
        await logoutRequest();
      } catch {
        // The API client clears the local token even when the server cannot complete logout.
      } finally {
        setGuest();
        setIsLoggingOut(false);
      }
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('nav.openAccount')}
            className="group h-12 max-w-[220px] gap-2.5 rounded-lg border border-transparent px-2.5 hover:border-border data-[state=open]:border-border data-[state=open]:bg-accent"
            variant="ghost"
          >
            <UserAvatar className="size-9 shrink-0" name={displayName} />
            <span className="hidden min-w-0 text-left sm:block">
              <strong className="block truncate text-sm font-semibold">{displayName}</strong>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {t(`nav.accountMenu.roles.${state.user.role}`)}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:block"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(15rem,calc(100vw-1.5rem))] p-0"
          sideOffset={6}
        >
          <DropdownMenuLabel className="px-3.5 py-3 font-normal">
            <strong className="block truncate text-sm font-semibold text-foreground">
              {displayName}
            </strong>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {state.user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="m-0" />
          <div className="p-1">
            <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2">
              <Link to="/account/profile">
                <UserRound aria-hidden="true" className="size-4" />
                {t('nav.accountMenu.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2">
              <Link to="/account/api-keys">
                <KeyRound aria-hidden="true" className="size-4" />
                {t('nav.accountMenu.apiKeys')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2">
              <a href="https://github.com/CaroLe-prw/modelMesh" rel="noreferrer" target="_blank">
                <SiGithub aria-hidden="true" className="size-4" />
                {t('nav.accountMenu.github')}
              </a>
            </DropdownMenuItem>
            {state.user.role === 'personal' ? (
              <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2">
                <Link to="/account/merchant-application">
                  <Store aria-hidden="true" className="size-4" />
                  {t('nav.accountMenu.merchantApplication')}
                </Link>
              </DropdownMenuItem>
            ) : null}
          </div>
          <DropdownMenuSeparator className="m-0" />
          <div className="p-1">
            <DropdownMenuItem
              className="gap-2.5 px-2.5 py-2"
              disabled={isLoggingOut}
              onSelect={() => void handleLogout()}
              variant="destructive"
            >
              {isLoggingOut ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <LogOut aria-hidden="true" className="size-4" />
              )}
              {t('nav.accountMenu.logout')}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="header-auth-actions flex items-center">
      <Button asChild className="header-auth-button" variant="outline">
        <Link to="/login">{t('nav.login')}</Link>
      </Button>
      <Button asChild className="header-auth-button header-auth-register">
        <Link to="/register">{t('nav.register')}</Link>
      </Button>
    </div>
  );
}
