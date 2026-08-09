import { Menu, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageMenuItems } from '@/components/common/language-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileNavigationItem {
  end: boolean;
  labelKey: string;
  to: string;
}

interface MobileHeaderMenuProps {
  isDark: boolean;
  items: readonly MobileNavigationItem[];
  onToggleTheme: () => void;
}

export function MobileHeaderMenu({ isDark, items, onToggleTheme }: MobileHeaderMenuProps) {
  const { t } = useTranslation();
  const themeLabel = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <div className="sm:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={t('nav.mobileMenu')} size="icon" variant="ghost">
            <Menu aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('nav.mainLabel')}
          </DropdownMenuLabel>
          {items.map((item) => (
            <DropdownMenuItem asChild key={item.to}>
              <NavLink end={item.end} to={item.to}>
                {t(item.labelKey)}
              </NavLink>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('preferences.label')}
          </DropdownMenuLabel>
          <LanguageMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onToggleTheme}>
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {themeLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
