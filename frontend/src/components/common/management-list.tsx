import { AlertCircle, LoaderCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { DataPagination } from '@/components/common/data-pagination';
import {
  ManagementDataList,
  ManagementFilterToolbar,
  type ManagementBatchAction,
  type ManagementDataColumn,
  type ManagementMobileField,
} from '@/components/common/management-data-list';
import { useManagementDataColumns } from '@/components/common/use-management-data-columns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PaginationMetadata } from '@/lib/pagination';

type ManagementPrimitiveKey = number | string;
type ManagementKeyField<T> = {
  [K in keyof T]-?: T[K] extends ManagementPrimitiveKey ? K : never;
}[keyof T];

export type ManagementRowKey<T> = ManagementKeyField<T> | ((item: T) => ManagementPrimitiveKey);

export interface ManagementListColumn<T> extends ManagementDataColumn<T> {
  mobile?:
    | false
    | {
        className?: string;
        label?: string;
        render?: (item: T) => ReactNode;
      };
}

export type ManagementListState =
  | { status: 'ready' }
  | { label: string; status: 'loading' }
  | { label: string; onRetry: () => void; retryLabel: string; status: 'error' };

export interface ManagementListPagination {
  disabled?: boolean;
  metadata: PaginationMetadata;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface ManagementListToolbar {
  filters?: ReactNode;
  isRefreshing?: boolean;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  placeholder: string;
  primaryAction?: ReactNode;
  query: string;
}

export interface ManagementListSelection<T> {
  actions?: ManagementBatchAction<T>[];
  disabled?: boolean;
}

export function ManagementList<T>({
  caption,
  columns,
  disabled = false,
  emptyDescription,
  emptyIcon,
  emptyText,
  items,
  mobileHeader,
  notice = null,
  pagination,
  rowKey,
  selection = false,
  state,
  tableClassName,
  tableStyle,
  toolbar,
}: {
  caption: string;
  columns: ManagementListColumn<T>[];
  disabled?: boolean;
  emptyDescription?: string;
  emptyIcon: LucideIcon;
  emptyText: string;
  items: T[];
  mobileHeader: (item: T) => ReactNode;
  notice?: string | null;
  pagination?: ManagementListPagination;
  rowKey: ManagementRowKey<T>;
  selection?: false | ManagementListSelection<T>;
  state: ManagementListState;
  tableClassName?: string;
  tableStyle?: CSSProperties;
  toolbar: ManagementListToolbar;
}) {
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useManagementDataColumns(columns);
  const mobileFields: ManagementMobileField<T>[] = columns.flatMap((column) => {
    if (column.mobile === false || !isColumnVisible(column.key)) return [];
    return [
      {
        className: column.mobile?.className,
        key: column.key,
        label: column.mobile?.label ?? column.label,
        render: column.mobile?.render ?? column.render,
      },
    ];
  });
  const getKey = (item: T) => resolveManagementRowKey(rowKey, item);

  return (
    <div className="grid min-w-0 gap-3">
      <ManagementFilterToolbar
        columnOptions={columnOptions}
        disabled={disabled}
        isRefreshing={toolbar.isRefreshing}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={toolbar.onQueryChange}
        onRefresh={toolbar.onRefresh}
        placeholder={toolbar.placeholder}
        primaryAction={toolbar.primaryAction}
        query={toolbar.query}
        visibleColumnKeys={visibleColumnKeys}
      >
        {toolbar.filters}
      </ManagementFilterToolbar>

      {state.status === 'loading' ? (
        <ManagementLoadingState label={state.label} />
      ) : state.status === 'error' ? (
        <ManagementErrorState
          label={state.label}
          onRetry={state.onRetry}
          retryLabel={state.retryLabel}
        />
      ) : (
        <>
          <ManagementDataList
            batchActions={selection === false ? [] : selection.actions}
            caption={caption}
            columns={visibleColumns}
            emptyDescription={emptyDescription}
            emptyIcon={emptyIcon}
            emptyText={emptyText}
            getKey={getKey}
            items={items}
            mobileFields={mobileFields}
            mobileHeader={mobileHeader}
            notice={notice}
            selectable={selection !== false}
            selectionDisabled={selection === false ? true : selection.disabled}
            tableClassName={tableClassName}
            tableStyle={tableStyle}
          />
          {pagination && pagination.metadata.total > 0 ? (
            <Card className="gap-0 py-0 shadow-sm">
              <DataPagination
                disabled={pagination.disabled}
                metadata={pagination.metadata}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
              />
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function resolveManagementRowKey<T>(rowKey: ManagementRowKey<T>, item: T): string {
  const value = (typeof rowKey === 'function' ? rowKey(item) : item[rowKey]) as number | string;
  return String(value);
}

function ManagementLoadingState({ label }: { label: string }) {
  return (
    <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
      <div>
        <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function ManagementErrorState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
      <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
      <strong className="mt-4 text-sm">{label}</strong>
      <Button className="mt-4" onClick={onRetry} type="button" variant="outline">
        <RefreshCw aria-hidden="true" />
        {retryLabel}
      </Button>
    </Card>
  );
}
