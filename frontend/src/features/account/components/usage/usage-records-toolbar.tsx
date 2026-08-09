import { Columns3, Download, RefreshCw, RotateCcw } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type UsageOptionalColumnId,
  usageFilterOptions,
  usageOptionalColumnIds,
} from '@/features/account/components/usage/usage-data';

export interface UsageFilters {
  apiKey: string;
  billingMode: string;
  endpoint: string;
  model: string;
  requestType: string;
}

interface UsageRecordsToolbarProps {
  filters: UsageFilters;
  isRefreshing: boolean;
  onColumnVisibilityChange: (column: UsageOptionalColumnId, visible: boolean) => void;
  onExport: () => void;
  onFilterChange: (name: keyof UsageFilters, value: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  visibleColumns: ReadonlySet<UsageOptionalColumnId>;
}

interface FilterSelectProps {
  label: string;
  onValueChange: (value: string) => void;
  optionLabelKeyPrefix?: string;
  options: readonly string[];
  value: string;
}

function FilterSelect({
  label,
  onValueChange,
  optionLabelKeyPrefix,
  options,
  value,
}: FilterSelectProps) {
  const { t } = useTranslation();

  return (
    <div className="grid min-w-0 gap-1.5">
      <Label className="truncate text-xs text-muted-foreground">{label}</Label>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('pages.account.sections.usage.filters.all')}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabelKeyPrefix ? t(`${optionLabelKeyPrefix}.${option}`) : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function UsageRecordsToolbar({
  filters,
  isRefreshing,
  onColumnVisibilityChange,
  onExport,
  onFilterChange,
  onRefresh,
  onReset,
  visibleColumns,
}: UsageRecordsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="border-b border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <FilterSelect
          label={t('pages.account.sections.usage.filters.apiKey')}
          onValueChange={(value) => onFilterChange('apiKey', value)}
          options={usageFilterOptions.apiKeys}
          value={filters.apiKey}
        />
        <FilterSelect
          label={t('pages.account.sections.usage.filters.model')}
          onValueChange={(value) => onFilterChange('model', value)}
          options={usageFilterOptions.models}
          value={filters.model}
        />
        <FilterSelect
          label={t('pages.account.sections.usage.filters.endpoint')}
          onValueChange={(value) => onFilterChange('endpoint', value)}
          options={usageFilterOptions.endpoints}
          value={filters.endpoint}
        />
        <FilterSelect
          label={t('pages.account.sections.usage.filters.requestType')}
          onValueChange={(value) => onFilterChange('requestType', value)}
          optionLabelKeyPrefix="pages.account.sections.usage.requestTypes"
          options={['stream', 'sync']}
          value={filters.requestType}
        />
        <FilterSelect
          label={t('pages.account.sections.usage.filters.billingMode')}
          onValueChange={(value) => onFilterChange('billingMode', value)}
          optionLabelKeyPrefix="pages.account.sections.usage.billingModes"
          options={['tokens', 'request']}
          value={filters.billingMode}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button
          aria-label={t('pages.account.sections.usage.actions.refresh')}
          className="w-full"
          disabled={isRefreshing}
          onClick={onRefresh}
          size="icon"
          title={t('pages.account.sections.usage.actions.refresh')}
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className={isRefreshing ? 'animate-spin' : undefined} />
        </Button>
        <Button className="w-full sm:w-auto" onClick={onReset} variant="outline">
          <RotateCcw aria-hidden="true" />
          {t('pages.account.sections.usage.actions.reset')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto" variant="outline">
              <Columns3 aria-hidden="true" />
              {t('pages.account.sections.usage.actions.columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('pages.account.sections.usage.columns.visible')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {usageOptionalColumnIds.map((column) => (
              <DropdownMenuCheckboxItem
                checked={visibleColumns.has(column)}
                key={column}
                onCheckedChange={(checked) => onColumnVisibilityChange(column, checked === true)}
                onSelect={(event) => event.preventDefault()}
              >
                {t(`pages.account.sections.usage.columns.${column}`)}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="whitespace-normal text-xs font-normal leading-5 text-muted-foreground">
              {t('pages.account.sections.usage.columns.fixedHint')}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className="w-full sm:w-auto" onClick={onExport}>
          <Download aria-hidden="true" />
          {t('pages.account.sections.usage.actions.exportCsv')}
        </Button>
      </div>
    </div>
  );
}
