import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accountRouteIcon } from '@/features/account/account-routes';
import type { AccountRouteGroup } from '@/features/account/api/account-routes';
import { useAccountRoutes } from '@/features/account/context/account-routes-context';

const navigationGroups: readonly AccountRouteGroup[] = ['admin', 'merchant', 'personal'];

export function AccountSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAccountRoutes();

  if (state.status !== 'ready' || state.routes.length === 0) {
    return null;
  }

  const navigationItems = navigationGroups.flatMap((group) =>
    state.routes.filter((item) => item.group === group),
  );
  const activeItem =
    navigationItems.find((item) => location.pathname === item.path) ?? navigationItems[0];

  return (
    <>
      <Card className="gap-0 py-0 shadow-sm lg:hidden">
        <div className="p-3">
          <Select onValueChange={navigate} value={activeItem.path}>
            <SelectTrigger
              aria-label={t('pages.account.navigation.mobileLabel')}
              className="h-11 min-w-0 flex-1"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {navigationItems.map((item) => {
                const Icon = accountRouteIcon(item.iconKey);

                return (
                  <SelectItem key={item.path} value={item.path}>
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4" />
                      {t(item.labelKey)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-[0_16px_45px_color-mix(in_srgb,var(--color-text)_5%,transparent)] lg:flex">
        <nav className="p-2.5" aria-label={t('pages.account.navigation.label')}>
          {navigationGroups.map((group) => {
            const groupItems = navigationItems.filter((item) => item.group === group);

            if (groupItems.length === 0) {
              return null;
            }

            return (
              <div className="not-first:mt-3" key={group}>
                <p className="px-3 pb-2.5 pt-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground">
                  {t(`pages.account.navigation.groups.${group}`)}
                </p>
                <div className="grid gap-1">
                  {groupItems.map((item) => {
                    const Icon = accountRouteIcon(item.iconKey);

                    return (
                      <Button
                        asChild
                        className="h-11 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                        key={item.path}
                        variant="ghost"
                      >
                        <NavLink to={item.path}>
                          <Icon aria-hidden="true" className="size-4.5" />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </NavLink>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </Card>
    </>
  );
}
