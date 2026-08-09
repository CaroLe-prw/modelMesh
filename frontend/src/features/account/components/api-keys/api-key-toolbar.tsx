import { Columns3, Plus, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
    <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid gap-2 sm:grid-cols-[minmax(260px,1fr)_150px] xl:w-[520px]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={t('pages.account.sections.apiKeys.searchPlaceholder')}
            className="pl-9"
            disabled={disabled}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('pages.account.sections.apiKeys.searchPlaceholder')}
            value={query}
          />
        </div>

        <Select
          disabled={disabled}
          onValueChange={(value) => onStatusChange(value as 'all' | ApiKeyStatus)}
          value={status}
        >
          <SelectTrigger
            className="w-full"
            aria-label={t('pages.account.sections.apiKeys.statusFilter')}
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
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-end xl:self-auto">
        <Button
          aria-label={t('pages.account.sections.apiKeys.refresh')}
          disabled={disabled || isRefreshing}
          onClick={onRefresh}
          size="icon"
          title={t('pages.account.sections.apiKeys.refresh')}
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className={isRefreshing ? 'animate-spin' : undefined} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden md:inline-flex" variant="outline">
              <Columns3 aria-hidden="true" />
              {t('pages.account.sections.apiKeys.columnSettings')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('pages.account.sections.apiKeys.visibleColumns')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {apiKeyOptionalColumnIds.map((column) => (
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has(column)}
                key={column}
                onCheckedChange={(checked) => onColumnVisibilityChange(column, checked === true)}
                onSelect={(event) => event.preventDefault()}
              >
                {t(`pages.account.sections.apiKeys.columns.${column}`)}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="whitespace-normal text-xs font-normal leading-5 text-muted-foreground">
              {t('pages.account.sections.apiKeys.fixedColumnsHint')}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className="flex-1 sm:flex-none" disabled={disabled} onClick={onCreate}>
          <Plus aria-hidden="true" />
          {t('pages.account.sections.apiKeys.create')}
        </Button>
      </div>
    </div>
  );
}
