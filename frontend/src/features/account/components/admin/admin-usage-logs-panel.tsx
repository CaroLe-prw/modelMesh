import { ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AdminDataList,
  AdminFilterToolbar,
  type AdminDataColumn,
  type AdminMobileField,
} from '@/features/account/components/admin/admin-data-list';
import {
  adminUsageLogs,
  formatMicrousd,
  type AdminUsageLog,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import {
  formatMerchantDate,
  type MerchantUsageStatus,
} from '@/features/account/components/merchant/merchant-demo-data';

type UsageStatusFilter = 'all' | MerchantUsageStatus;
const usageStatuses: UsageStatusFilter[] = ['all', 'succeeded', 'failed'];

export function AdminUsageLogsPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<UsageStatusFilter>('all');
  const visibleLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminUsageLogs.filter((log) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        log.id.toLocaleLowerCase().includes(normalizedQuery) ||
        log.merchant.toLocaleLowerCase().includes(normalizedQuery) ||
        log.model.toLocaleLowerCase().includes(normalizedQuery) ||
        log.user.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || log.status === status);
    });
  }, [query, status]);

  const columns: AdminDataColumn<AdminUsageLog>[] = [
    {
      className: 'min-w-44 px-4',
      key: 'request',
      label: t('pages.account.sections.admin.usageLogs.columns.request'),
      render: (log) => (
        <div>
          <strong className="block font-mono text-xs">{log.id}</strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{log.model}</span>
        </div>
      ),
    },
    {
      key: 'merchant',
      label: t('pages.account.sections.admin.usageLogs.columns.merchant'),
      render: (log) => log.merchant,
    },
    {
      key: 'user',
      label: t('pages.account.sections.admin.usageLogs.columns.user'),
      render: (log) => <span className="font-mono text-xs">{log.user}</span>,
    },
    {
      key: 'tokens',
      label: t('pages.account.sections.admin.usageLogs.columns.tokens'),
      render: (log) => <span className="font-mono">{log.tokens.toLocaleString()}</span>,
    },
    {
      key: 'cost',
      label: t('pages.account.sections.admin.usageLogs.columns.cost'),
      render: (log) => (
        <span className="font-mono text-xs">
          {formatMicrousd(i18n.resolvedLanguage, log.costMicrousd)}
        </span>
      ),
    },
    {
      key: 'latency',
      label: t('pages.account.sections.admin.usageLogs.columns.latency'),
      render: (log) => <span className="font-mono">{log.latencyMs.toLocaleString()} ms</span>,
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.usageLogs.columns.status'),
      render: (log) => <AdminStatusBadge namespace="usageLogs" status={log.status} />,
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.usageLogs.columns.createdAt'),
      render: (log) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
        </span>
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminUsageLog>[] = [
    {
      key: 'merchant',
      label: t('pages.account.sections.admin.usageLogs.columns.merchant'),
      render: (log) => log.merchant,
    },
    {
      key: 'user',
      label: t('pages.account.sections.admin.usageLogs.columns.user'),
      render: (log) => log.user,
    },
    {
      key: 'tokens',
      label: t('pages.account.sections.admin.usageLogs.columns.tokens'),
      render: (log) => log.tokens.toLocaleString(),
    },
    {
      key: 'cost',
      label: t('pages.account.sections.admin.usageLogs.columns.cost'),
      render: (log) => formatMicrousd(i18n.resolvedLanguage, log.costMicrousd),
    },
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        onQueryChange={setQuery}
        placeholder={t('pages.account.sections.admin.usageLogs.search')}
        query={query}
      >
        <Select onValueChange={(value) => setStatus(value as UsageStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.usageLogs.statusFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {usageStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.usageLogs.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.usageLogs.caption')}
        columns={columns}
        emptyIcon={ScrollText}
        emptyText={t('pages.account.sections.admin.usageLogs.empty')}
        getKey={(log) => log.id}
        items={visibleLogs}
        mobileFields={mobileFields}
        mobileHeader={(log) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate font-mono text-xs">{log.id}</strong>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {log.model}
              </span>
            </div>
            <AdminStatusBadge namespace="usageLogs" status={log.status} />
          </div>
        )}
      />
    </div>
  );
}
