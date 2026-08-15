import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataPagination } from '@/components/common/data-pagination';
import {
  ManagementDataList,
  type ManagementDataColumn,
  type ManagementMobileField,
} from '@/components/common/management-data-list';
import { ApiKeyActions } from '@/features/account/components/api-keys/api-key-actions';
import {
  ApiKeyMaskedValue,
  ApiKeyStatusBadge,
} from '@/features/account/components/api-keys/api-key-display';
import {
  ApiKeyIpRules,
  ApiKeyRateLimits,
} from '@/features/account/components/api-keys/api-key-metadata';
import type {
  ApiKeyItem,
  ApiKeyOptionalColumnId,
} from '@/features/account/components/api-keys/api-key-types';
import type { PaginationMetadata } from '@/lib/pagination';

const columnWidths: Record<ApiKeyOptionalColumnId, number> = {
  key: 220,
  concurrency: 100,
  usage: 190,
  rateLimits: 230,
  expiry: 130,
  status: 100,
  lastUsedAt: 160,
  lastUsedIp: 140,
  ipWhitelist: 210,
  ipBlacklist: 210,
  createdAt: 160,
};

interface ApiKeyListProps {
  apiKeys: ApiKeyItem[];
  copiedKeyId: string | null;
  disabled: boolean;
  isLoading: boolean;
  onCopy: (apiKey: ApiKeyItem) => void;
  onDelete: (apiKey: ApiKeyItem) => void;
  onEdit: (apiKey: ApiKeyItem) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onToggleStatus: (apiKey: ApiKeyItem) => void;
  pagination: PaginationMetadata;
  visibleColumns: ReadonlySet<ApiKeyOptionalColumnId>;
}

export function ApiKeyList({
  apiKeys,
  copiedKeyId,
  disabled,
  isLoading,
  onCopy,
  onDelete,
  onEdit,
  onPageChange,
  onPageSizeChange,
  onToggleStatus,
  pagination,
  visibleColumns,
}: ApiKeyListProps) {
  const { i18n, t } = useTranslation();
  const currencyFormatter = new Intl.NumberFormat(i18n.language, {
    currency: 'USD',
    minimumFractionDigits: 4,
    style: 'currency',
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const tableMinWidth = Math.max(
    520,
    308 + Array.from(visibleColumns).reduce((total, column) => total + columnWidths[column], 0),
  );
  const columns: ManagementDataColumn<ApiKeyItem>[] = [
    {
      className: 'w-[140px] min-w-[140px] px-4 font-medium',
      key: 'name',
      label: t('pages.account.sections.apiKeys.columns.name'),
      render: (apiKey) => apiKey.name,
      sticky: 'left',
    },
  ];

  if (visibleColumns.has('key')) {
    columns.push({
      className: 'min-w-[220px]',
      key: 'key',
      label: t('pages.account.sections.apiKeys.columns.key'),
      render: (apiKey) => (
        <ApiKeyMaskedValue apiKey={apiKey} copied={copiedKeyId === apiKey.id} onCopy={onCopy} />
      ),
    });
  }
  if (visibleColumns.has('concurrency')) {
    columns.push({
      className: 'min-w-[100px] text-center',
      key: 'concurrency',
      label: t('pages.account.sections.apiKeys.columns.concurrency'),
      render: (apiKey) => (
        <span className="inline-flex min-w-7 justify-center rounded-md bg-secondary px-2 py-1 font-mono text-xs font-semibold">
          {apiKey.concurrency}
        </span>
      ),
    });
  }
  if (visibleColumns.has('usage')) {
    columns.push({
      className: 'min-w-[190px]',
      key: 'usage',
      label: t('pages.account.sections.apiKeys.columns.usage'),
      render: (apiKey) => (
        <span className="grid gap-0.5 font-mono text-xs tabular-nums">
          <span>
            <span className="text-muted-foreground">
              {t('pages.account.sections.apiKeys.today')}
            </span>{' '}
            {currencyFormatter.format(apiKey.usageToday)}
          </span>
          <span>
            <span className="text-muted-foreground">
              {t('pages.account.sections.apiKeys.last30Days')}
            </span>{' '}
            {currencyFormatter.format(apiKey.usageLast30Days)}
          </span>
        </span>
      ),
    });
  }
  if (visibleColumns.has('rateLimits')) {
    columns.push({
      className: 'min-w-[230px]',
      key: 'rateLimits',
      label: t('pages.account.sections.apiKeys.columns.rateLimits'),
      render: (apiKey) => <ApiKeyRateLimits apiKey={apiKey} />,
    });
  }
  if (visibleColumns.has('expiry')) {
    columns.push({
      className: 'min-w-[130px] text-xs text-muted-foreground',
      key: 'expiry',
      label: t('pages.account.sections.apiKeys.columns.expiry'),
      render: (apiKey) =>
        apiKey.expiresAt
          ? dateFormatter.format(new Date(apiKey.expiresAt))
          : t('pages.account.sections.apiKeys.permanent'),
    });
  }
  if (visibleColumns.has('status')) {
    columns.push({
      className: 'min-w-[100px]',
      key: 'status',
      label: t('pages.account.sections.apiKeys.columns.status'),
      render: (apiKey) => <ApiKeyStatusBadge status={apiKey.status} />,
    });
  }
  if (visibleColumns.has('lastUsedAt')) {
    columns.push({
      className: 'min-w-[160px] font-mono text-xs text-muted-foreground',
      key: 'lastUsedAt',
      label: t('pages.account.sections.apiKeys.columns.lastUsedAt'),
      render: (apiKey) =>
        apiKey.lastUsedAt ? dateFormatter.format(new Date(apiKey.lastUsedAt)) : '—',
    });
  }
  if (visibleColumns.has('lastUsedIp')) {
    columns.push({
      className: 'min-w-[140px] font-mono text-xs text-muted-foreground',
      key: 'lastUsedIp',
      label: t('pages.account.sections.apiKeys.columns.lastUsedIp'),
      render: (apiKey) => apiKey.lastUsedIp ?? '—',
    });
  }
  if (visibleColumns.has('ipWhitelist')) {
    columns.push({
      className: 'min-w-[210px] max-w-[210px]',
      key: 'ipWhitelist',
      label: t('pages.account.sections.apiKeys.columns.ipWhitelist'),
      render: (apiKey) => (
        <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipWhitelist} />
      ),
    });
  }
  if (visibleColumns.has('ipBlacklist')) {
    columns.push({
      className: 'min-w-[210px] max-w-[210px]',
      key: 'ipBlacklist',
      label: t('pages.account.sections.apiKeys.columns.ipBlacklist'),
      render: (apiKey) => (
        <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipBlacklist} />
      ),
    });
  }
  if (visibleColumns.has('createdAt')) {
    columns.push({
      className: 'min-w-[160px] font-mono text-xs text-muted-foreground',
      key: 'createdAt',
      label: t('pages.account.sections.apiKeys.columns.createdAt'),
      render: (apiKey) => dateFormatter.format(new Date(apiKey.createdAt)),
    });
  }
  columns.push({
    className: 'w-[168px] min-w-[168px] text-center',
    key: 'actions',
    label: t('pages.account.sections.apiKeys.columns.actions'),
    render: (apiKey) => (
      <ApiKeyActions
        apiKey={apiKey}
        disabled={disabled}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
      />
    ),
    sticky: 'right',
  });

  const mobileFields: ManagementMobileField<ApiKeyItem>[] = [];
  if (visibleColumns.has('concurrency')) {
    mobileFields.push({
      key: 'concurrency',
      label: t('pages.account.sections.apiKeys.columns.concurrency'),
      render: (apiKey) => <span className="font-mono tabular-nums">{apiKey.concurrency}</span>,
    });
  }
  if (visibleColumns.has('usage')) {
    mobileFields.push({
      key: 'usage',
      label: t('pages.account.sections.apiKeys.columns.usage'),
      render: (apiKey) => (
        <span className="grid gap-0.5 font-mono tabular-nums">
          <span>
            {t('pages.account.sections.apiKeys.today')}{' '}
            {currencyFormatter.format(apiKey.usageToday)}
          </span>
          <span>
            {t('pages.account.sections.apiKeys.last30Days')}{' '}
            {currencyFormatter.format(apiKey.usageLast30Days)}
          </span>
        </span>
      ),
    });
  }
  if (visibleColumns.has('rateLimits')) {
    mobileFields.push({
      className: 'col-span-2',
      key: 'rateLimits',
      label: t('pages.account.sections.apiKeys.columns.rateLimits'),
      render: (apiKey) => <ApiKeyRateLimits apiKey={apiKey} />,
    });
  }
  if (visibleColumns.has('expiry')) {
    mobileFields.push({
      key: 'expiry',
      label: t('pages.account.sections.apiKeys.columns.expiry'),
      render: (apiKey) =>
        apiKey.expiresAt
          ? dateFormatter.format(new Date(apiKey.expiresAt))
          : t('pages.account.sections.apiKeys.permanent'),
    });
  }
  if (visibleColumns.has('lastUsedAt')) {
    mobileFields.push({
      key: 'lastUsedAt',
      label: t('pages.account.sections.apiKeys.columns.lastUsedAt'),
      render: (apiKey) =>
        apiKey.lastUsedAt ? dateFormatter.format(new Date(apiKey.lastUsedAt)) : '—',
    });
  }
  if (visibleColumns.has('lastUsedIp')) {
    mobileFields.push({
      key: 'lastUsedIp',
      label: t('pages.account.sections.apiKeys.columns.lastUsedIp'),
      render: (apiKey) => (
        <span className="font-mono tabular-nums">{apiKey.lastUsedIp ?? '—'}</span>
      ),
    });
  }
  if (visibleColumns.has('ipWhitelist')) {
    mobileFields.push({
      className: 'col-span-2',
      key: 'ipWhitelist',
      label: t('pages.account.sections.apiKeys.columns.ipWhitelist'),
      render: (apiKey) => (
        <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipWhitelist} />
      ),
    });
  }
  if (visibleColumns.has('ipBlacklist')) {
    mobileFields.push({
      className: 'col-span-2',
      key: 'ipBlacklist',
      label: t('pages.account.sections.apiKeys.columns.ipBlacklist'),
      render: (apiKey) => (
        <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipBlacklist} />
      ),
    });
  }
  if (visibleColumns.has('createdAt')) {
    mobileFields.push({
      key: 'createdAt',
      label: t('pages.account.sections.apiKeys.columns.createdAt'),
      render: (apiKey) => dateFormatter.format(new Date(apiKey.createdAt)),
    });
  }
  mobileFields.push({
    className: 'col-span-2',
    key: 'actions',
    label: t('pages.account.sections.apiKeys.columns.actions'),
    render: (apiKey) => (
      <ApiKeyActions
        apiKey={apiKey}
        disabled={disabled}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
      />
    ),
  });

  return (
    <>
      <ManagementDataList
        caption={t('pages.account.sections.apiKeys.tableCaption')}
        columns={columns}
        emptyDescription={t('pages.account.sections.apiKeys.emptyDescription')}
        emptyIcon={KeyRound}
        emptyText={t('pages.account.sections.apiKeys.emptyTitle')}
        footer={
          pagination.total > 0 ? (
            <DataPagination
              disabled={isLoading || disabled}
              metadata={pagination}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          ) : undefined
        }
        getKey={(apiKey) => apiKey.id}
        items={apiKeys}
        mobileFields={mobileFields}
        mobileHeader={(apiKey) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{apiKey.name}</strong>
              <div className="mt-2 max-w-full">
                <ApiKeyMaskedValue
                  apiKey={apiKey}
                  copied={copiedKeyId === apiKey.id}
                  onCopy={onCopy}
                />
              </div>
            </div>
            <ApiKeyStatusBadge status={apiKey.status} />
          </div>
        )}
        notice={null}
        selectionDisabled={disabled}
        tableStyle={{ minWidth: tableMinWidth }}
      />
      <span aria-live="polite" className="sr-only">
        {copiedKeyId ? t('pages.account.sections.apiKeys.copyFeedback') : ''}
      </span>
    </>
  );
}
