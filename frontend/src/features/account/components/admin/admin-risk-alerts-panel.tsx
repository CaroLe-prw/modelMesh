import { CheckCheck, Eye, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useManagementDataColumns as useAdminDataColumns } from '@/components/common/use-management-data-columns';
import { Button } from '@/components/ui/button';
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
  adminRiskAlerts,
  type AdminRiskAlert,
  type AdminRiskSeverity,
  type AdminRiskStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type RiskSeverityFilter = 'all' | AdminRiskSeverity;
type RiskStatusFilter = 'all' | AdminRiskStatus;

const severities: RiskSeverityFilter[] = ['all', 'critical', 'high', 'medium', 'low'];
const statuses: RiskStatusFilter[] = ['all', 'open', 'investigating', 'resolved'];
const severityClasses: Record<AdminRiskSeverity, string> = {
  critical: 'border-destructive/25 bg-destructive/10 text-destructive',
  high: 'border-warning/30 bg-warning/12 text-warning',
  low: 'border-border bg-secondary text-muted-foreground',
  medium: 'border-primary/25 bg-primary/10 text-primary',
};

export function AdminRiskAlertsPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<RiskSeverityFilter>('all');
  const [status, setStatus] = useState<RiskStatusFilter>('all');
  const visibleAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminRiskAlerts.filter((alert) => {
      const summary = t(
        `pages.account.sections.admin.riskAlerts.summaries.${alert.summaryKey}`,
      ).toLocaleLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        alert.id.toLocaleLowerCase().includes(normalizedQuery) ||
        alert.principal.toLocaleLowerCase().includes(normalizedQuery) ||
        alert.ip.includes(normalizedQuery) ||
        summary.includes(normalizedQuery);
      return (
        matchesQuery &&
        (severity === 'all' || alert.severity === severity) &&
        (status === 'all' || alert.status === status)
      );
    });
  }, [query, severity, status, t]);

  function showPreview() {
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  const columns: AdminDataColumn<AdminRiskAlert>[] = [
    {
      className: 'min-w-64 px-4',
      key: 'alert',
      label: t('pages.account.sections.admin.riskAlerts.columns.alert'),
      render: (alert) => (
        <div>
          <strong className="block text-sm">
            {t(`pages.account.sections.admin.riskAlerts.summaries.${alert.summaryKey}`)}
          </strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{alert.id}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: t('pages.account.sections.admin.riskAlerts.columns.type'),
      render: (alert) => (
        <span className="text-xs font-medium">
          {t(`pages.account.sections.admin.riskAlerts.types.${alert.type}`)}
        </span>
      ),
    },
    {
      key: 'severity',
      label: t('pages.account.sections.admin.riskAlerts.columns.severity'),
      render: (alert) => <RiskSeverityBadge severity={alert.severity} />,
    },
    {
      className: 'min-w-48',
      key: 'principal',
      label: t('pages.account.sections.admin.riskAlerts.columns.principal'),
      render: (alert) => (
        <div>
          <span className="block font-mono text-xs">{alert.principal}</span>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{alert.ip}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.riskAlerts.columns.status'),
      render: (alert) => <AdminStatusBadge namespace="riskAlerts" status={alert.status} />,
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.riskAlerts.columns.createdAt'),
      render: (alert) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, alert.createdAt)}
        </span>
      ),
    },
    {
      className: 'min-w-24 text-center',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.riskAlerts.columns.actions'),
      render: (alert) => <RiskActions onAct={showPreview} resolved={alert.status === 'resolved'} />,
    },
  ];
  const mobileFields: AdminMobileField<AdminRiskAlert>[] = [
    {
      key: 'type',
      label: t('pages.account.sections.admin.riskAlerts.columns.type'),
      render: (alert) => t(`pages.account.sections.admin.riskAlerts.types.${alert.type}`),
    },
    {
      key: 'principal',
      label: t('pages.account.sections.admin.riskAlerts.columns.principal'),
      render: (alert) => alert.principal,
    },
    {
      key: 'ip',
      label: t('pages.account.sections.admin.riskAlerts.columns.ip'),
      render: (alert) => alert.ip,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.riskAlerts.columns.createdAt'),
      render: (alert) => formatMerchantDate(i18n.resolvedLanguage, alert.createdAt),
    },
    {
      key: 'actions',
      label: t('pages.account.sections.admin.riskAlerts.columns.actions'),
      render: (alert) => <RiskActions onAct={showPreview} resolved={alert.status === 'resolved'} />,
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
        placeholder={t('pages.account.sections.admin.riskAlerts.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select
          onValueChange={(value) => setSeverity(value as RiskSeverityFilter)}
          value={severity}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.riskAlerts.severityFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {severities.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.riskAlerts.severities.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => setStatus(value as RiskStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.riskAlerts.statusFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.riskAlerts.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.riskAlerts.caption')}
        columns={visibleColumns}
        emptyIcon={ShieldAlert}
        emptyText={t('pages.account.sections.admin.riskAlerts.empty')}
        getKey={(alert) => alert.id}
        items={visibleAlerts}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(alert) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm">
                {t(`pages.account.sections.admin.riskAlerts.summaries.${alert.summaryKey}`)}
              </strong>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">{alert.id}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <RiskSeverityBadge severity={alert.severity} />
              <AdminStatusBadge namespace="riskAlerts" status={alert.status} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function RiskSeverityBadge({ severity }: { severity: AdminRiskSeverity }) {
  const { t } = useTranslation();

  return (
    <Badge className={severityClasses[severity]} variant="outline">
      {t(`pages.account.sections.admin.riskAlerts.severities.${severity}`)}
    </Badge>
  );
}

function RiskActions({ onAct, resolved }: { onAct: () => void; resolved: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-1 md:justify-center">
      <Button
        aria-label={t('pages.account.sections.admin.riskAlerts.actions.inspect')}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <Eye aria-hidden="true" />
      </Button>
      <Button
        aria-label={t('pages.account.sections.admin.riskAlerts.actions.resolve')}
        disabled={resolved}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <CheckCheck aria-hidden="true" className="text-success" />
      </Button>
    </div>
  );
}
