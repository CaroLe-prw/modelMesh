import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/brand';
import { HeaderAccountActions } from '@/components/layout/header-account-actions';
import { HeaderDisplayControls } from '@/components/layout/header-display-controls';
import { MobileHeaderMenu } from '@/components/layout/mobile-header-menu';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/models', labelKey: 'nav.models', end: false },
  { to: '/account', labelKey: 'nav.account', end: false },
];

interface SiteHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function SiteHeader({ isDark, onToggleTheme }: SiteHeaderProps) {
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

        <div className="flex items-center gap-0.5">
          <MobileHeaderMenu isDark={isDark} items={navItems} onToggleTheme={onToggleTheme} />
          <HeaderDisplayControls isDark={isDark} onToggleTheme={onToggleTheme} />
          <HeaderAccountActions />
        </div>
      </div>
    </header>
  );
}
