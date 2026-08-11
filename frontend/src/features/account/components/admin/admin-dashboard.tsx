import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  CircleDollarSign,
  Store,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  adminAuditLogs,
  adminMerchants,
  adminWithdrawalReviews,
  formatMicrousd,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

const DASHBOARD_PREVIEW_LIMIT = 5;

export function AdminDashboard() {
  const { i18n, t } = useTranslation();
  const pendingWithdrawals = adminWithdrawalReviews
    .filter((item) => item.status === 'pending')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const pendingMerchants = adminMerchants
    .filter((item) => item.status === 'pending')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const dashboardStats = [
    {
      icon: Store,
      key: 'merchants',
      trendCount: pendingMerchants.length,
      value: adminMerchants.length,
    },
    {
      icon: ClipboardCheck,
      key: 'pendingWithdrawals',
      trendCount: pendingWithdrawals.length,
      value: pendingWithdrawals.length,
    },
    { icon: Activity, key: 'requests', value: '64,281' },
    { icon: CircleDollarSign, key: 'volume', valueMicrousd: 248_720_000 },
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(({ icon: Icon, key, ...stat }) => {
          const trendKey = `pages.account.sections.admin.dashboard.stats.${key}.trend`;
          const trend =
            'trendCount' in stat ? t(trendKey, { count: stat.trendCount }) : t(trendKey);

          return (
            <Card className="gap-0 p-4 shadow-sm" key={key}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <Badge className="border-success/20 bg-success/8 text-success" variant="outline">
                  <TrendingUp aria-hidden="true" className="size-3" />
                  {trend}
                </Badge>
              </div>
              <strong className="mt-5 font-mono text-2xl tracking-[-0.04em]">
                {'valueMicrousd' in stat
                  ? formatMicrousd(i18n.resolvedLanguage, stat.valueMicrousd)
                  : stat.value}
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">
                {t(`pages.account.sections.admin.dashboard.stats.${key}.label`)}
              </span>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('pages.account.sections.admin.dashboard.todo.title')}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t('pages.account.sections.admin.dashboard.todo.description', {
              count: DASHBOARD_PREVIEW_LIMIT,
            })}
          </p>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <DashboardHeader
              description={t(
                'pages.account.sections.admin.dashboard.pendingWithdrawals.description',
              )}
              href="/admin/withdrawals"
              title={t('pages.account.sections.admin.dashboard.pendingWithdrawals.title')}
              viewAllLabel={t('pages.account.sections.admin.dashboard.viewAll')}
            />
            <div className="divide-y divide-border">
              {pendingWithdrawals.slice(0, DASHBOARD_PREVIEW_LIMIT).map((withdrawal) => (
                <div className="flex min-h-18 items-center gap-3 p-4" key={withdrawal.id}>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{withdrawal.merchant}</strong>
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      {withdrawal.id}
                    </span>
                  </div>
                  <strong className="font-mono text-sm">
                    {formatMicrousd(i18n.resolvedLanguage, withdrawal.amountMicrousd)}
                  </strong>
                  <AdminStatusBadge namespace="withdrawals" status={withdrawal.status} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <DashboardHeader
              description={t('pages.account.sections.admin.dashboard.pendingMerchants.description')}
              href="/admin/merchants"
              title={t('pages.account.sections.admin.dashboard.pendingMerchants.title')}
              viewAllLabel={t('pages.account.sections.admin.dashboard.viewAll')}
            />
            <div className="divide-y divide-border">
              {pendingMerchants.slice(0, DASHBOARD_PREVIEW_LIMIT).map((merchant) => (
                <div className="flex min-h-18 items-center gap-3 p-4" key={merchant.id}>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{merchant.name}</strong>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {merchant.email} · {merchant.id}
                    </span>
                  </div>
                  <AdminStatusBadge namespace="merchants" status={merchant.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <DashboardHeader
          description={t('pages.account.sections.admin.dashboard.recentAudit.description')}
          title={t('pages.account.sections.admin.dashboard.recentAudit.title')}
        />
        <div className="divide-y divide-border">
          {adminAuditLogs.slice(0, 3).map((log) => (
            <div
              className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              key={log.id}
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm">
                  {t(`pages.account.sections.admin.auditLogs.actions.${log.actionKey}`)}
                </strong>
                <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {log.actor} · {log.target}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
              </span>
              <AdminStatusBadge namespace="auditLogs" status={log.outcome} />
            </div>
          ))}
        </div>
      </Card>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.admin.previewNotice')}
      </p>
    </div>
  );
}

function DashboardHeader({
  description,
  href,
  title,
  viewAllLabel,
}: {
  description: string;
  href?: string;
  title: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex min-h-23 items-start justify-between gap-4 border-b border-border p-4">
      <div className="min-w-0">
        <strong className="text-base">{title}</strong>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {href === undefined || viewAllLabel === undefined ? null : (
        <Button asChild className="shrink-0" size="sm" variant="ghost">
          <Link to={href}>
            {viewAllLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
