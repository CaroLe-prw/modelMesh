import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
  RefreshCw,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ManagementDataColumn<T> {
  className?: string;
  headerClassName?: string;
  hideable?: boolean;
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sort?: {
    active: boolean;
    direction: 'asc' | 'desc';
    label: string;
    onChange: () => void;
  };
}

export interface ManagementMobileField<T> {
  className?: string;
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export interface ManagementColumnOption<K extends string = string> {
  key: K;
  label: string;
}

export interface ManagementBatchAction<T> {
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  icon?: LucideIcon;
  key: string;
  label: string;
  onClick: (selectedItems: T[], clearSelection: () => void) => void;
  variant?: 'default' | 'destructive' | 'ghost' | 'outline' | 'secondary';
}

const managementColumnMinimumWidth = 160;
const managementSelectionColumnWidth = 48;

export function ManagementListActions<K extends string>({
  columnOptions,
  disabled = false,
  isRefreshing = false,
  onColumnVisibilityChange,
  onRefresh,
  visibleColumnKeys,
}: {
  columnOptions: ManagementColumnOption<K>[];
  disabled?: boolean;
  isRefreshing?: boolean;
  onColumnVisibilityChange: (column: K, visible: boolean) => void;
  onRefresh: () => void;
  visibleColumnKeys: ReadonlySet<K>;
}) {
  const { t } = useTranslation();
  const [isLocallyRefreshing, setIsLocallyRefreshing] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshing = isRefreshing || isLocallyRefreshing;

  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    },
    [],
  );

  function handleRefresh() {
    setIsLocallyRefreshing(true);
    try {
      onRefresh();
    } finally {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        setIsLocallyRefreshing(false);
        refreshTimerRef.current = null;
      }, 450);
    }
  }

  return (
    <>
      <Button
        aria-label={t('common.listActions.refresh')}
        className="shrink-0"
        disabled={disabled || refreshing}
        onClick={handleRefresh}
        size="icon"
        title={t('common.listActions.refresh')}
        type="button"
        variant="outline"
      >
        <RefreshCw aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="min-w-0 flex-1 md:flex-none" disabled={disabled} variant="outline">
            <Columns3 aria-hidden="true" />
            {t('common.listActions.columns')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('common.listActions.visibleColumns')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columnOptions.map((column) => (
            <DropdownMenuCheckboxItem
              checked={visibleColumnKeys.has(column.key)}
              key={column.key}
              onCheckedChange={(checked) => onColumnVisibilityChange(column.key, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="whitespace-normal text-xs font-normal leading-5 text-muted-foreground">
            {t('common.listActions.fixedColumnsHint')}
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function ManagementFilterToolbar<K extends string>({
  children,
  columnOptions,
  disabled = false,
  isRefreshing = false,
  onColumnVisibilityChange,
  onQueryChange,
  onRefresh,
  placeholder,
  primaryAction,
  query,
  visibleColumnKeys,
}: {
  children?: ReactNode;
  columnOptions: ManagementColumnOption<K>[];
  disabled?: boolean;
  isRefreshing?: boolean;
  onColumnVisibilityChange: (column: K, visible: boolean) => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  placeholder: string;
  primaryAction?: ReactNode;
  query: string;
  visibleColumnKeys: ReadonlySet<K>;
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap">
        <div className="relative min-w-0 flex-1 md:min-w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={placeholder}
            className="pl-9"
            disabled={disabled}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            value={query}
          />
        </div>
        {children}
        <div className="flex w-full items-center gap-2 md:w-auto">
          <ManagementListActions
            columnOptions={columnOptions}
            disabled={disabled}
            isRefreshing={isRefreshing}
            onColumnVisibilityChange={onColumnVisibilityChange}
            onRefresh={onRefresh}
            visibleColumnKeys={visibleColumnKeys}
          />
          {primaryAction}
        </div>
      </div>
    </Card>
  );
}

export function ManagementDataList<T>({
  batchActions = [],
  caption,
  columns,
  emptyDescription,
  emptyIcon: EmptyIcon,
  emptyText,
  footer,
  getKey,
  items,
  mobileFields,
  mobileHeader,
  notice,
  selectable = true,
  selectionDisabled = false,
  tableClassName,
  tableStyle,
}: {
  batchActions?: ManagementBatchAction<T>[];
  caption: string;
  columns: ManagementDataColumn<T>[];
  emptyDescription?: string;
  emptyIcon: LucideIcon;
  emptyText: string;
  footer?: ReactNode;
  getKey: (item: T) => string;
  items: T[];
  mobileFields: ManagementMobileField<T>[];
  mobileHeader: (item: T) => ReactNode;
  notice?: string | null;
  selectable?: boolean;
  selectionDisabled?: boolean;
  tableClassName?: string;
  tableStyle?: CSSProperties;
}) {
  const { t } = useTranslation();
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const selectedItems = items.filter((item) => selectedKeys.has(getKey(item)));
  const selectedItemKeys = new Set(selectedItems.map(getKey));
  const allItemsSelected =
    items.length > 0 && items.every((item) => selectedKeys.has(getKey(item)));
  const someItemsSelected = selectedItems.length > 0 && !allItemsSelected;
  const adaptiveTableStyle: CSSProperties = {
    minWidth:
      columns.length * managementColumnMinimumWidth +
      (selectable ? managementSelectionColumnWidth : 0),
    ...tableStyle,
  };

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function setItemSelected(item: T, selected: boolean) {
    const key = getKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (selected) next.add(key);
      else next.delete(key);

      return next;
    });
  }

  function setAllItemsSelected(selected: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);

      for (const item of items) {
        const key = getKey(item);
        if (selected) next.add(key);
        else next.delete(key);
      }

      return next;
    });
  }

  if (items.length === 0) {
    return (
      <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
        <EmptyIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <strong className="mt-4 text-sm">{emptyText}</strong>
        {emptyDescription && (
          <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">
            {emptyDescription}
          </p>
        )}
      </Card>
    );
  }

  return (
    <>
      {selectable && selectedItems.length > 0 && (
        <Card className="gap-0 py-0 shadow-sm">
          <div
            aria-label={t('common.listSelection.toolbarLabel')}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
            role="toolbar"
          >
            <span className="text-sm font-medium text-primary">
              {t('common.listSelection.selectedCount', { count: selectedItems.length })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {batchActions.map((action) => {
                const Icon = action.icon;
                const disabled =
                  selectionDisabled ||
                  (typeof action.disabled === 'function'
                    ? action.disabled(selectedItems)
                    : action.disabled === true);

                return (
                  <Button
                    disabled={disabled}
                    key={action.key}
                    onClick={() => action.onClick(selectedItems, clearSelection)}
                    size="sm"
                    type="button"
                    variant={action.variant ?? 'outline'}
                  >
                    {Icon && <Icon aria-hidden="true" />}
                    {action.label}
                  </Button>
                );
              })}
              <Button onClick={clearSelection} size="sm" type="button" variant="ghost">
                {t('common.listSelection.clear')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table
          className={cn('table-fixed', tableClassName)}
          selectable={selectable}
          style={adaptiveTableStyle}
        >
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              {selectable && (
                <TableHead className="w-12 min-w-12 px-4">
                  <Checkbox
                    aria-label={t('common.listSelection.selectAll')}
                    checked={allItemsSelected ? true : someItemsSelected ? 'indeterminate' : false}
                    disabled={selectionDisabled}
                    onCheckedChange={(checked) => setAllItemsSelected(checked === true)}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  aria-sort={
                    column.sort?.active
                      ? column.sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cn(column.className, column.headerClassName)}
                  key={column.key}
                >
                  {column.sort ? (
                    <Button
                      aria-label={column.sort.label}
                      className="mx-auto h-8 px-2 font-medium"
                      onClick={column.sort.onChange}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {column.label}
                      {column.sort.active ? (
                        column.sort.direction === 'asc' ? (
                          <ArrowUp aria-hidden="true" className="text-muted-foreground" />
                        ) : (
                          <ArrowDown aria-hidden="true" className="text-muted-foreground" />
                        )
                      ) : (
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground/55" />
                      )}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                className="group h-16"
                data-state={selectedItemKeys.has(getKey(item)) ? 'selected' : undefined}
                key={getKey(item)}
              >
                {selectable && (
                  <TableCell className="w-12 min-w-12 px-4">
                    <Checkbox
                      aria-label={t('common.listSelection.selectItem', { id: getKey(item) })}
                      checked={selectedItemKeys.has(getKey(item))}
                      disabled={selectionDisabled}
                      onCheckedChange={(checked) => setItemSelected(item, checked === true)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell className={column.className} key={column.key}>
                    <div className="flex min-w-0 justify-center text-center">
                      {column.render(item)}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {footer}
      </Card>

      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Card
            className="gap-4 p-4 shadow-sm data-[state=selected]:border-primary/35 data-[state=selected]:bg-primary/5"
            data-state={selectedItemKeys.has(getKey(item)) ? 'selected' : undefined}
            key={getKey(item)}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <Checkbox
                  aria-label={t('common.listSelection.selectItem', { id: getKey(item) })}
                  checked={selectedItemKeys.has(getKey(item))}
                  className="mt-0.5 size-5"
                  disabled={selectionDisabled}
                  onCheckedChange={(checked) => setItemSelected(item, checked === true)}
                />
              )}
              <div className="min-w-0 flex-1">{mobileHeader(item)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/45 p-3 text-xs">
              {mobileFields.map((field) => (
                <div className={field.className} key={field.key}>
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="mt-1 min-w-0 break-words font-medium">{field.render(item)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      {footer && <Card className="gap-0 py-0 md:hidden">{footer}</Card>}

      {notice !== null && (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          {notice ?? t('pages.account.sections.admin.previewNotice')}
        </p>
      )}
    </>
  );
}
