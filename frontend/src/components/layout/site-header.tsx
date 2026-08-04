import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/brand';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/models', labelKey: 'nav.models', end: false },
  { to: '/account', labelKey: 'nav.account', end: false },
];

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="relative z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-17 w-full max-w-[1212px] items-center justify-between px-4">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.mainLabel')}>
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-xs transition-colors hover:bg-accent hover:text-foreground',
                  isActive
                    ? 'bg-accent font-semibold text-foreground'
                    : 'font-medium text-muted-foreground',
                )
              }
              end={item.end}
              to={item.to}
              key={item.to}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="header-auth-actions flex items-center">
          <Link
            className={buttonVariants({
              variant: 'outline',
              className: 'header-auth-button',
            })}
            to="/login"
          >
            {t('nav.login')}
          </Link>
          <Link
            className={buttonVariants({
              className: 'header-auth-button header-auth-register',
            })}
            to="/register"
          >
            {t('nav.register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
