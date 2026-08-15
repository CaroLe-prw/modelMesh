import { Check, WalletCards, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  adminWithdrawalReviews,
  formatMicrousd,
  type AdminWithdrawalReview,
  type AdminWithdrawalStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type WithdrawalStatusFilter = 'all' | AdminWithdrawalStatus;
const withdrawalStatuses: WithdrawalStatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

export function AdminWithdrawalsPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<WithdrawalStatusFilter>('all');
  const visibleWithdrawals = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminWithdrawalReviews.filter((withdrawal) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        withdrawal.id.toLocaleLowerCase().includes(normalizedQuery) ||
        withdrawal.merchant.toLocaleLowerCase().includes(normalizedQuery) ||
        withdrawal.account.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || withdrawal.status === status);
    });
  }, [query, status]);

  function showPreview() {
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  const columns: AdminDataColumn<AdminWithdrawalReview>[] = [
    {
      className: 'min-w-48 px-4',
      key: 'withdrawal',
      label: t('pages.account.sections.admin.withdrawals.columns.withdrawal'),
      render: (withdrawal) => (
        <div>
          <strong className="block text-sm">{withdrawal.merchant}</strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">
            {withdrawal.id}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('pages.account.sections.admin.withdrawals.columns.amount'),
      render: (withdrawal) => (
        <strong className="font-mono text-sm">
          {formatMicrousd(i18n.resolvedLanguage, withdrawal.amountMicrousd)}
        </strong>
      ),
    },
    {
      className: 'min-w-44',
      key: 'account',
      label: t('pages.account.sections.admin.withdrawals.columns.account'),
      render: (withdrawal) => (
        <div>
          <span className="block font-mono text-xs">{withdrawal.account}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{withdrawal.currency}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.withdrawals.columns.status'),
      render: (withdrawal) => (
        <AdminStatusBadge namespace="withdrawals" status={withdrawal.status} />
      ),
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.withdrawals.columns.createdAt'),
      render: (withdrawal) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, withdrawal.createdAt)}
        </span>
      ),
    },
    {
      className: 'min-w-24 text-right',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.withdrawals.columns.actions'),
      render: (withdrawal) => (
        <WithdrawalActions pending={withdrawal.status === 'pending'} onAct={showPreview} />
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminWithdrawalReview>[] = [
    {
      key: 'amount',
      label: t('pages.account.sections.admin.withdrawals.columns.amount'),
      render: (withdrawal) => formatMicrousd(i18n.resolvedLanguage, withdrawal.amountMicrousd),
    },
    {
      key: 'account',
      label: t('pages.account.sections.admin.withdrawals.columns.account'),
      render: (withdrawal) => `${withdrawal.currency} · ${withdrawal.account}`,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.withdrawals.columns.createdAt'),
      render: (withdrawal) => formatMerchantDate(i18n.resolvedLanguage, withdrawal.createdAt),
    },
    {
      key: 'actions',
      label: t('pages.account.sections.admin.withdrawals.columns.actions'),
      render: (withdrawal) => (
        <WithdrawalActions pending={withdrawal.status === 'pending'} onAct={showPreview} />
      ),
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
        placeholder={t('pages.account.sections.admin.withdrawals.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select
          onValueChange={(value) => setStatus(value as WithdrawalStatusFilter)}
          value={status}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.withdrawals.statusFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {withdrawalStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.withdrawals.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.withdrawals.caption')}
        columns={visibleColumns}
        emptyIcon={WalletCards}
        emptyText={t('pages.account.sections.admin.withdrawals.empty')}
        getKey={(withdrawal) => withdrawal.id}
        items={visibleWithdrawals}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(withdrawal) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{withdrawal.merchant}</strong>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {withdrawal.id}
              </span>
            </div>
            <AdminStatusBadge namespace="withdrawals" status={withdrawal.status} />
          </div>
        )}
      />
    </div>
  );
}

function WithdrawalActions({ onAct, pending }: { onAct: () => void; pending: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-1">
      <Button
        aria-label={t('pages.account.sections.admin.withdrawals.actions.approve')}
        disabled={!pending}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <Check aria-hidden="true" className="text-success" />
      </Button>
      <Button
        aria-label={t('pages.account.sections.admin.withdrawals.actions.reject')}
        disabled={!pending}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <X aria-hidden="true" className="text-destructive" />
      </Button>
    </div>
  );
}
