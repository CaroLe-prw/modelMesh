import { Settings2, Store } from 'lucide-react';
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
  adminMerchants,
  formatMicrousd,
  type AdminMerchant,
  type AdminMerchantStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type MerchantStatusFilter = 'all' | AdminMerchantStatus;
const merchantStatuses: MerchantStatusFilter[] = ['all', 'active', 'pending', 'suspended'];

export function AdminMerchantsPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<MerchantStatusFilter>('all');
  const visibleMerchants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminMerchants.filter((merchant) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        merchant.name.toLocaleLowerCase().includes(normalizedQuery) ||
        merchant.email.toLocaleLowerCase().includes(normalizedQuery) ||
        merchant.id.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || merchant.status === status);
    });
  }, [query, status]);

  function showPreview() {
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  const columns: AdminDataColumn<AdminMerchant>[] = [
    {
      className: 'min-w-60 px-4',
      key: 'merchant',
      label: t('pages.account.sections.admin.merchants.columns.merchant'),
      render: (merchant) => (
        <div>
          <strong className="block text-sm">{merchant.name}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">{merchant.email}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.merchants.columns.status'),
      render: (merchant) => <AdminStatusBadge namespace="merchants" status={merchant.status} />,
    },
    {
      key: 'channels',
      label: t('pages.account.sections.admin.merchants.columns.channels'),
      render: (merchant) => <span className="font-mono">{merchant.channelCount}</span>,
    },
    {
      key: 'models',
      label: t('pages.account.sections.admin.merchants.columns.models'),
      render: (merchant) => <span className="font-mono">{merchant.modelCount}</span>,
    },
    {
      key: 'balance',
      label: t('pages.account.sections.admin.merchants.columns.balance'),
      render: (merchant) => (
        <span className="font-mono text-xs">
          {formatMicrousd(i18n.resolvedLanguage, merchant.balanceMicrousd)}
        </span>
      ),
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.merchants.columns.createdAt'),
      render: (merchant) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, merchant.createdAt)}
        </span>
      ),
    },
    {
      className: 'w-18 text-right',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.merchants.columns.actions'),
      render: (merchant) => (
        <Button
          aria-label={t('pages.account.sections.admin.merchants.manageLabel', {
            merchant: merchant.name,
          })}
          onClick={showPreview}
          size="icon-sm"
          variant="ghost"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminMerchant>[] = [
    {
      key: 'channels',
      label: t('pages.account.sections.admin.merchants.columns.channels'),
      render: (merchant) => merchant.channelCount,
    },
    {
      key: 'models',
      label: t('pages.account.sections.admin.merchants.columns.models'),
      render: (merchant) => merchant.modelCount,
    },
    {
      key: 'balance',
      label: t('pages.account.sections.admin.merchants.columns.balance'),
      render: (merchant) => formatMicrousd(i18n.resolvedLanguage, merchant.balanceMicrousd),
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.merchants.columns.createdAt'),
      render: (merchant) => formatMerchantDate(i18n.resolvedLanguage, merchant.createdAt),
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
        placeholder={t('pages.account.sections.admin.merchants.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select onValueChange={(value) => setStatus(value as MerchantStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.merchants.statusFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {merchantStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.merchants.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.merchants.caption')}
        columns={visibleColumns}
        emptyIcon={Store}
        emptyText={t('pages.account.sections.admin.merchants.empty')}
        getKey={(merchant) => merchant.id}
        items={visibleMerchants}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(merchant) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{merchant.name}</strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {merchant.email}
              </span>
            </div>
            <AdminStatusBadge namespace="merchants" status={merchant.status} />
          </div>
        )}
      />
    </div>
  );
}
