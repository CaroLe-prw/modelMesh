import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listAllAccountRoutes,
  updateAccountRouteRoles,
  type AccountRouteConfig,
} from '@/features/account/api/account-routes';
import { useAccountRoutes } from '@/features/account/context/account-routes-context';
import type { AccountRole } from '@/features/auth/api/auth';

const roles: readonly AccountRole[] = ['personal', 'merchant', 'admin'];

export function RouteAccessPanel() {
  const { t } = useTranslation();
  const { applyRouteUpdate } = useAccountRoutes();
  const [routes, setRoutes] = useState<AccountRouteConfig[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [savingRouteKey, setSavingRouteKey] = useState<string>();

  const loadRoutes = useCallback(() => {
    setStatus('loading');
    void listAllAccountRoutes()
      .then((items) => {
        setRoutes(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(loadRoutes, [loadRoutes]);

  async function setRole(route: AccountRouteConfig, role: AccountRole, checked: boolean) {
    const nextRoles = checked
      ? [...route.roles, role]
      : route.roles.filter((currentRole) => currentRole !== role);

    setSavingRouteKey(route.routeKey);
    try {
      const updated = await updateAccountRouteRoles(route.routeKey, nextRoles);
      setRoutes((current) =>
        current.map((item) => (item.routeKey === updated.routeKey ? updated : item)),
      );
      applyRouteUpdate(updated);
      toast.success(t('pages.account.sections.routeAccess.feedback.saved'));
    } catch {
      toast.error(t('pages.account.sections.routeAccess.feedback.saveFailed'));
    } finally {
      setSavingRouteKey(undefined);
    }
  }

  if (status === 'loading') {
    return (
      <Card className="grid min-h-52 place-items-center p-8 text-center shadow-sm">
        <div>
          <LoaderCircle aria-hidden="true" className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t('pages.account.sections.routeAccess.loading')}
          </p>
        </div>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="items-center gap-0 p-8 text-center shadow-sm">
        <strong className="text-sm">{t('pages.account.sections.routeAccess.loadError')}</strong>
        <Button className="mt-4" onClick={loadRoutes} variant="outline">
          <RefreshCw aria-hidden="true" className="size-4" />
          {t('pages.account.sections.routeAccess.retry')}
        </Button>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">
            {t('pages.account.sections.routeAccess.tableCaption')}
          </TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              <TableHead className="h-12 min-w-52 px-4">
                {t('pages.account.sections.routeAccess.columns.route')}
              </TableHead>
              <TableHead className="min-w-64">
                {t('pages.account.sections.routeAccess.columns.path')}
              </TableHead>
              {roles.map((role) => (
                <TableHead className="w-28" key={role}>
                  {t(`pages.account.sections.routeAccess.roles.${role}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <RouteAccessTableRow
                key={route.routeKey}
                route={route}
                saving={savingRouteKey === route.routeKey}
                onRoleChange={setRole}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {routes.map((route) => (
          <RouteAccessCard
            key={route.routeKey}
            route={route}
            saving={savingRouteKey === route.routeKey}
            onRoleChange={setRole}
          />
        ))}
      </div>
    </>
  );
}

interface RouteAccessItemProps {
  onRoleChange: (route: AccountRouteConfig, role: AccountRole, checked: boolean) => void;
  route: AccountRouteConfig;
  saving: boolean;
}

function RouteAccessTableRow({ onRoleChange, route, saving }: RouteAccessItemProps) {
  const { t } = useTranslation();

  return (
    <TableRow className="h-15">
      <TableCell className="px-4 font-medium">{t(route.labelKey)}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{route.path}</TableCell>
      {roles.map((role) => (
        <TableCell className="text-center" key={role}>
          <RouteRoleSwitch
            disabled={saving}
            onCheckedChange={(checked) => onRoleChange(route, role, checked)}
            role={role}
            route={route}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

function RouteAccessCard({ onRoleChange, route, saving }: RouteAccessItemProps) {
  const { t } = useTranslation();

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="min-w-0">
        <strong className="text-sm">{t(route.labelKey)}</strong>
        <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
          {route.path}
        </code>
      </div>
      <div className="grid gap-3">
        {roles.map((role) => (
          <div className="flex min-h-10 items-center justify-between gap-3" key={role}>
            <span className="text-sm">{t(`pages.account.sections.routeAccess.roles.${role}`)}</span>
            <RouteRoleSwitch
              disabled={saving}
              onCheckedChange={(checked) => onRoleChange(route, role, checked)}
              role={role}
              route={route}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

interface RouteRoleSwitchProps {
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  role: AccountRole;
  route: AccountRouteConfig;
}

function RouteRoleSwitch({ disabled, onCheckedChange, role, route }: RouteRoleSwitchProps) {
  const { t } = useTranslation();
  const isBootstrapPermission = route.routeKey === 'admin.route-access';

  return (
    <Switch
      aria-label={t('pages.account.sections.routeAccess.roleToggle', {
        role: t(`pages.account.sections.routeAccess.roles.${role}`),
        route: t(route.labelKey),
      })}
      checked={route.roles.includes(role)}
      disabled={disabled || isBootstrapPermission}
      onCheckedChange={onCheckedChange}
    />
  );
}
