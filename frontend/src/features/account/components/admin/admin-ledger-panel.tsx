import { ArrowDownLeft, ArrowUpRight, BookLock, CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  adminLedgerEntries,
  formatMicrousd,
  type AdminLedgerEntry,
  type AdminLedgerType,
  type AdminReconciliationStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type LedgerTypeFilter = 'all' | AdminLedgerType;
type ReconciliationFilter = 'all' | AdminReconciliationStatus;

const ledgerTypes: LedgerTypeFilter[] = ['all', 'topup', 'usage', 'merchantRevenue', 'withdrawal'];
const reconciliationStatuses: ReconciliationFilter[] = ['all', 'matched', 'pending', 'mismatch'];

export function AdminLedgerPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<LedgerTypeFilter>('all');
  const [reconciliation, setReconciliation] = useState<ReconciliationFilter>('all');
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminLedgerEntries.filter((entry) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.id.toLocaleLowerCase().includes(normalizedQuery) ||
        entry.account.toLocaleLowerCase().includes(normalizedQuery) ||
        entry.reference.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (type === 'all' || entry.type === type) &&
        (reconciliation === 'all' || entry.reconciliationStatus === reconciliation)
      );
    });
  }, [query, reconciliation, type]);
  const totals = useMemo(
    () =>
      adminLedgerEntries.reduce(
        (result, entry) => {
          result[entry.direction] += entry.amountMicrousd;
          if (entry.reconciliationStatus !== 'matched') result.exceptions += 1;
          return result;
        },
        { credit: 0, debit: 0, exceptions: 0 },
      ),
    [],
  );

  const columns: AdminDataColumn<AdminLedgerEntry>[] = [
    {
      className: 'min-w-52 px-4',
      key: 'entry',
      label: t('pages.account.sections.admin.ledger.columns.entry'),
      render: (entry) => (
        <div>
          <strong className="block text-sm">
            {t(`pages.account.sections.admin.ledger.types.${entry.type}`)}
          </strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{entry.id}</span>
        </div>
      ),
    },
    {
      className: 'min-w-44',
      key: 'account',
      label: t('pages.account.sections.admin.ledger.columns.account'),
      render: (entry) => <span className="font-mono text-xs">{entry.account}</span>,
    },
    {
      key: 'direction',
      label: t('pages.account.sections.admin.ledger.columns.direction'),
      render: (entry) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          {entry.direction === 'credit' ? (
            <ArrowDownLeft aria-hidden="true" className="size-4 text-success" />
          ) : (
            <ArrowUpRight aria-hidden="true" className="size-4 text-warning" />
          )}
          {t(`pages.account.sections.admin.ledger.directions.${entry.direction}`)}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('pages.account.sections.admin.ledger.columns.amount'),
      render: (entry) => (
        <strong className="font-mono text-sm">
          {formatMicrousd(i18n.resolvedLanguage, entry.amountMicrousd)}
        </strong>
      ),
    },
    {
      className: 'min-w-48',
      key: 'reference',
      label: t('pages.account.sections.admin.ledger.columns.reference'),
      render: (entry) => <span className="font-mono text-xs">{entry.reference}</span>,
    },
    {
      key: 'reconciliation',
      label: t('pages.account.sections.admin.ledger.columns.reconciliation'),
      render: (entry) => (
        <AdminStatusBadge namespace="ledger" status={entry.reconciliationStatus} />
      ),
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.ledger.columns.createdAt'),
      render: (entry) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, entry.createdAt)}
        </span>
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminLedgerEntry>[] = [
    {
      key: 'amount',
      label: t('pages.account.sections.admin.ledger.columns.amount'),
      render: (entry) => formatMicrousd(i18n.resolvedLanguage, entry.amountMicrousd),
    },
    {
      key: 'direction',
      label: t('pages.account.sections.admin.ledger.columns.direction'),
      render: (entry) => t(`pages.account.sections.admin.ledger.directions.${entry.direction}`),
    },
    {
      key: 'reference',
      label: t('pages.account.sections.admin.ledger.columns.reference'),
      render: (entry) => entry.reference,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.ledger.columns.createdAt'),
      render: (entry) => formatMerchantDate(i18n.resolvedLanguage, entry.createdAt),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(columns);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <LedgerStat
          icon={ArrowDownLeft}
          label={t('pages.account.sections.admin.ledger.stats.credit')}
          value={formatMicrousd(i18n.resolvedLanguage, totals.credit)}
        />
        <LedgerStat
          icon={ArrowUpRight}
          label={t('pages.account.sections.admin.ledger.stats.debit')}
          value={formatMicrousd(i18n.resolvedLanguage, totals.debit)}
        />
        <LedgerStat
          icon={CircleAlert}
          label={t('pages.account.sections.admin.ledger.stats.exceptions')}
          value={String(totals.exceptions)}
        />
      </div>
      <AdminFilterToolbar
        columnOptions={columnOptions}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={setQuery}
        onRefresh={() => undefined}
        placeholder={t('pages.account.sections.admin.ledger.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select onValueChange={(value) => setType(value as LedgerTypeFilter)} value={type}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.ledger.typeFilter')}
            className="w-full md:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ledgerTypes.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.ledger.types.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => setReconciliation(value as ReconciliationFilter)}
          value={reconciliation}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.ledger.reconciliationFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reconciliationStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.ledger.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.ledger.caption')}
        columns={visibleColumns}
        emptyIcon={BookLock}
        emptyText={t('pages.account.sections.admin.ledger.empty')}
        getKey={(entry) => entry.id}
        items={visibleEntries}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(entry) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm">
                {t(`pages.account.sections.admin.ledger.types.${entry.type}`)}
              </strong>
              <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                {entry.account}
              </span>
            </div>
            <AdminStatusBadge namespace="ledger" status={entry.reconciliationStatus} />
          </div>
        )}
      />
    </div>
  );
}

function LedgerStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ArrowDownLeft;
  label: string;
  value: string;
}) {
  return (
    <Card className="gap-3 py-0 shadow-sm">
      <CardHeader className="grid grid-cols-[auto_1fr] items-center gap-x-3 px-4 pt-4">
        <span className="row-span-2 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pl-16">
        <strong className="font-mono text-lg">{value}</strong>
      </CardContent>
    </Card>
  );
}
