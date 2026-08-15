import { FileClock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useManagementDataColumns as useAdminDataColumns } from '@/components/common/use-management-data-columns';
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
  adminAuditLogs,
  type AdminAuditLog,
  type AdminAuditOutcome,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type AuditOutcomeFilter = 'all' | AdminAuditOutcome;
const auditOutcomes: AuditOutcomeFilter[] = ['all', 'succeeded', 'failed'];

export function AdminAuditLogsPanel() {
  const { i18n, t } = useTranslation();
  const [outcome, setOutcome] = useState<AuditOutcomeFilter>('all');
  const [query, setQuery] = useState('');
  const visibleLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminAuditLogs.filter((log) => {
      const action = t(
        `pages.account.sections.admin.auditLogs.actions.${log.actionKey}`,
      ).toLocaleLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        log.id.toLocaleLowerCase().includes(normalizedQuery) ||
        log.actor.toLocaleLowerCase().includes(normalizedQuery) ||
        log.target.toLocaleLowerCase().includes(normalizedQuery) ||
        log.ip.includes(normalizedQuery) ||
        action.includes(normalizedQuery);
      return matchesQuery && (outcome === 'all' || log.outcome === outcome);
    });
  }, [outcome, query, t]);

  const columns: AdminDataColumn<AdminAuditLog>[] = [
    {
      className: 'min-w-52 px-4',
      key: 'action',
      label: t('pages.account.sections.admin.auditLogs.columns.action'),
      render: (log) => (
        <div>
          <strong className="block text-sm">
            {t(`pages.account.sections.admin.auditLogs.actions.${log.actionKey}`)}
          </strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{log.id}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      label: t('pages.account.sections.admin.auditLogs.columns.actor'),
      render: (log) => <span className="text-xs">{log.actor}</span>,
    },
    {
      className: 'min-w-44',
      key: 'target',
      label: t('pages.account.sections.admin.auditLogs.columns.target'),
      render: (log) => <span className="font-mono text-xs">{log.target}</span>,
    },
    {
      key: 'ip',
      label: t('pages.account.sections.admin.auditLogs.columns.ip'),
      render: (log) => <span className="font-mono text-xs">{log.ip}</span>,
    },
    {
      key: 'outcome',
      label: t('pages.account.sections.admin.auditLogs.columns.outcome'),
      render: (log) => <AdminStatusBadge namespace="auditLogs" status={log.outcome} />,
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.auditLogs.columns.createdAt'),
      render: (log) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
        </span>
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminAuditLog>[] = [
    {
      key: 'actor',
      label: t('pages.account.sections.admin.auditLogs.columns.actor'),
      render: (log) => log.actor,
    },
    {
      key: 'target',
      label: t('pages.account.sections.admin.auditLogs.columns.target'),
      render: (log) => log.target,
    },
    {
      key: 'ip',
      label: t('pages.account.sections.admin.auditLogs.columns.ip'),
      render: (log) => log.ip,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.auditLogs.columns.createdAt'),
      render: (log) => formatMerchantDate(i18n.resolvedLanguage, log.createdAt),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(columns);

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        columnOptions={columnOptions}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={setQuery}
        onRefresh={() => undefined}
        placeholder={t('pages.account.sections.admin.auditLogs.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select onValueChange={(value) => setOutcome(value as AuditOutcomeFilter)} value={outcome}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.auditLogs.outcomeFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {auditOutcomes.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.auditLogs.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.auditLogs.caption')}
        columns={visibleColumns}
        emptyIcon={FileClock}
        emptyText={t('pages.account.sections.admin.auditLogs.empty')}
        getKey={(log) => log.id}
        items={visibleLogs}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(log) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm">
                {t(`pages.account.sections.admin.auditLogs.actions.${log.actionKey}`)}
              </strong>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">{log.id}</span>
            </div>
            <AdminStatusBadge namespace="auditLogs" status={log.outcome} />
          </div>
        )}
      />
    </div>
  );
}
