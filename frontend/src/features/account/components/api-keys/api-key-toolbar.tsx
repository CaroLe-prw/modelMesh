import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ManagementFilterToolbar } from '@/components/common/management-data-list';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  apiKeyOptionalColumnIds,
  apiKeyStatusOptions,
  type ApiKeyStatus,
  type ApiKeyOptionalColumnId,
} from '@/features/account/components/api-keys/api-key-types';

interface ApiKeyToolbarProps {
  disabled?: boolean;
  isRefreshing: boolean;
  onColumnVisibilityChange: (column: ApiKeyOptionalColumnId, visible: boolean) => void;
  onCreate: () => void;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onStatusChange: (value: 'all' | ApiKeyStatus) => void;
  query: string;
  status: 'all' | ApiKeyStatus;
  visibleColumns: ReadonlySet<ApiKeyOptionalColumnId>;
}

export function ApiKeyToolbar({
  disabled = false,
  isRefreshing,
  onColumnVisibilityChange,
  onCreate,
  onQueryChange,
  onRefresh,
  onStatusChange,
  query,
  status,
  visibleColumns,
}: ApiKeyToolbarProps) {
  const { t } = useTranslation();

  return (
    <ManagementFilterToolbar
      columnOptions={apiKeyOptionalColumnIds.map((column) => ({
        key: column,
        label: t(`pages.account.sections.apiKeys.columns.${column}`),
      }))}
      disabled={disabled}
      isRefreshing={isRefreshing}
      onColumnVisibilityChange={onColumnVisibilityChange}
      onQueryChange={onQueryChange}
      onRefresh={onRefresh}
      placeholder={t('pages.account.sections.apiKeys.searchPlaceholder')}
      primaryAction={
        <Button className="flex-1 md:flex-none" disabled={disabled} onClick={onCreate}>
          <Plus aria-hidden="true" />
          {t('pages.account.sections.apiKeys.create')}
        </Button>
      }
      query={query}
      visibleColumnKeys={visibleColumns}
    >
      <Select
        disabled={disabled}
        onValueChange={(value) => onStatusChange(value as 'all' | ApiKeyStatus)}
        value={status}
      >
        <SelectTrigger
          aria-label={t('pages.account.sections.apiKeys.statusFilter')}
          className="w-full md:w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('pages.account.sections.apiKeys.allStatuses')}</SelectItem>
          {apiKeyStatusOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`pages.account.sections.apiKeys.statuses.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ManagementFilterToolbar>
  );
}
