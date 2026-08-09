import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/context/auth-context';

function getDisplayName(email: string): string {
  const [localPart] = email.split('@');

  return localPart || email;
}

export function HeaderAccountActions() {
  const { t } = useTranslation();
  const { state } = useAuth();

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
    const displayName = getDisplayName(state.user.email);

    return (
      <Button
        asChild
        className="h-11 max-w-[220px] gap-2.5 rounded-lg border border-transparent px-2.5 hover:border-border"
        variant="ghost"
      >
        <Link aria-label={t('nav.openAccount')} to="/account">
          <UserAvatar className="size-8 shrink-0" name={displayName} />
          <span className="hidden min-w-0 truncate text-sm font-semibold sm:block">
            {displayName}
          </span>
        </Link>
      </Button>
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
