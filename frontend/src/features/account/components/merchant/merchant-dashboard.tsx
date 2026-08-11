import { Activity, Boxes, CircleDollarSign, RadioTower, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  formatMerchantDate,
  formatUsd,
  merchantChannels,
  merchantModels,
  merchantUsageLogs,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

const statCards = [
  {
    icon: RadioTower,
    key: 'channels',
    value: merchantChannels.filter((channel) => channel.status === 'active').length,
  },
  {
    icon: Boxes,
    key: 'models',
    value: merchantModels.filter((model) => model.status === 'published').length,
  },
  { icon: Activity, key: 'requests', value: '12,864' },
  { icon: CircleDollarSign, key: 'revenue', value: '$248.72' },
] as const;

export function MerchantDashboard() {
  const { i18n, t } = useTranslation();

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ icon: Icon, key, value }) => (
          <Card className="gap-0 p-4 shadow-sm" key={key}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <Badge className="border-success/20 bg-success/8 text-success" variant="outline">
                <TrendingUp aria-hidden="true" className="size-3" />
                {t(`pages.account.sections.merchant.dashboard.stats.${key}.trend`)}
              </Badge>
            </div>
            <strong className="mt-5 font-mono text-2xl tracking-[-0.04em]">{value}</strong>
            <span className="mt-1 text-xs text-muted-foreground">
              {t(`pages.account.sections.merchant.dashboard.stats.${key}.label`)}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <DashboardCardHeader
            description={t('pages.account.sections.merchant.dashboard.channelHealth.description')}
            title={t('pages.account.sections.merchant.dashboard.channelHealth.title')}
          />
          <div className="divide-y divide-border">
            {merchantChannels.slice(0, 3).map((channel) => (
              <div className="flex items-center gap-3 p-4" key={channel.id}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-bold text-muted-foreground">
                  {channel.provider.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{channel.name}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t('pages.account.sections.merchant.dashboard.channelHealth.metrics', {
                      latency: channel.latencyMs,
                      successRate: channel.successRate.toFixed(2),
                    })}
                  </span>
                </div>
                <MerchantStatusBadge namespace="channels" status={channel.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <DashboardCardHeader
            description={t('pages.account.sections.merchant.dashboard.recentUsage.description')}
            title={t('pages.account.sections.merchant.dashboard.recentUsage.title')}
          />
          <div className="divide-y divide-border">
            {merchantUsageLogs.slice(0, 3).map((log) => (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                key={log.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-xs">{log.id}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {log.model} · {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold">
                  {formatUsd(i18n.resolvedLanguage, log.cost)}
                </span>
                <MerchantStatusBadge namespace="usageLogs" status={log.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}

function DashboardCardHeader({ description, title }: { description: string; title: string }) {
  return (
    <div className="border-b border-border p-4">
      <strong className="text-sm">{title}</strong>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
