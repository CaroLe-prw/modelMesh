import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { accountRouteIcon } from '@/features/account/account-routes';
import type { AccountRouteGroup } from '@/features/account/api/account-routes';
import { useAccountRoutes } from '@/features/account/context/account-routes-context';

const navigationGroups: readonly AccountRouteGroup[] = ['admin', 'merchant', 'personal'];

export function AccountSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { state } = useAccountRoutes();
  const mobileNavigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const navigation = mobileNavigationRef.current;
      const activeLink = navigation?.querySelector<HTMLElement>('[aria-current="page"]');

      if (!navigation || !activeLink) return;

      const navigationRect = navigation.getBoundingClientRect();
      const activeLinkRect = activeLink.getBoundingClientRect();
      const centeredScrollLeft =
        navigation.scrollLeft +
        activeLinkRect.left -
        navigationRect.left -
        (navigation.clientWidth - activeLinkRect.width) / 2;
      const maximumScrollLeft = navigation.scrollWidth - navigation.clientWidth;

      navigation.scrollTo({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        left: Math.min(Math.max(centeredScrollLeft, 0), maximumScrollLeft),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  if (state.status !== 'ready' || state.routes.length === 0) {
    return null;
  }

  const navigationItems = navigationGroups.flatMap((group) =>
    state.routes.filter((item) => item.group === group),
  );
  return (
    <>
      <Card className="relative w-full min-w-0 max-w-full gap-0 overflow-hidden py-0 shadow-sm lg:hidden">
        <nav
          aria-label={t('pages.account.navigation.mobileLabel')}
          className="account-mobile-route-scroll flex w-full min-w-0 max-w-full snap-x snap-proximity gap-1.5 overflow-x-auto p-2.5"
          ref={mobileNavigationRef}
        >
          {navigationItems.map((item) => {
            const Icon = accountRouteIcon(item.iconKey);

            return (
              <Button
                asChild
                className="h-11 flex-none snap-center justify-start gap-2.5 rounded-lg px-3.5 text-sm font-medium text-muted-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                key={item.path}
                variant="ghost"
              >
                <NavLink end to={item.path}>
                  <Icon aria-hidden="true" className="size-4.5" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              </Button>
            );
          })}
        </nav>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-card to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-card to-transparent"
        />
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
