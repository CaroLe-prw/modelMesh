import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { UsageAnalytics } from '@/features/account/components/usage/usage-analytics';
import {
  type UsageOptionalColumnId,
  usageOptionalColumnIds,
  usageRecords,
} from '@/features/account/components/usage/usage-data';
import {
  type UsageFilters,
  UsageRecordsToolbar,
} from '@/features/account/components/usage/usage-records-toolbar';
import { UsageRecordsTable } from '@/features/account/components/usage/usage-records-table';
import { UsageSummaryCards } from '@/features/account/components/usage/usage-summary-cards';
import { UsageTimeControls } from '@/features/account/components/usage/usage-time-controls';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

const initialFilters: UsageFilters = {
  apiKey: 'all',
  billingMode: 'all',
  endpoint: 'all',
  model: 'all',
  requestType: 'all',
};

export function UsageDashboard() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<UsageFilters>(initialFilters);
  const [visibleColumns, setVisibleColumns] = useState<Set<UsageOptionalColumnId>>(
    () => new Set(usageOptionalColumnIds),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );

  const filteredRecords = useMemo(
    () =>
      usageRecords.filter(
        (record) =>
          (filters.apiKey === 'all' || record.apiKey === filters.apiKey) &&
          (filters.model === 'all' || record.model === filters.model) &&
          (filters.endpoint === 'all' || record.endpoint === filters.endpoint) &&
          (filters.requestType === 'all' || record.requestType === filters.requestType) &&
          (filters.billingMode === 'all' || record.billingMode === filters.billingMode),
      ),
    [filters],
  );

  const visibleRecords = useMemo(() => {
    if (filteredRecords.length === 0) {
      return [];
    }

    const count = Math.min(pageSize, filteredRecords.length);
    const start = ((currentPage - 1) * pageSize) % filteredRecords.length;

    return Array.from(
      { length: count },
      (_, index) => filteredRecords[(start + index) % filteredRecords.length],
    );
  }, [currentPage, filteredRecords, pageSize]);

  const hasActiveFilters = Object.values(filters).some((value) => value !== 'all');
  const totalResults = hasActiveFilters ? filteredRecords.length : 35_235;

  function handleFilterChange(name: keyof UsageFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  }

  function handleColumnVisibilityChange(column: UsageOptionalColumnId, visible: boolean) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (visible) {
        next.add(column);
      } else {
        next.delete(column);
      }
      return next;
    });
  }

  function handleReset() {
    setFilters(initialFilters);
    setCurrentPage(1);
  }

  function handleRefresh() {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    setIsRefreshing(true);
    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimerRef.current = null;
    }, 500);
  }

  function handleExport() {
    const headers = usageOptionalColumnIds.map((column) =>
      t(`pages.account.sections.usage.columns.${column}`),
    );
    const rows = filteredRecords.map((record) => [
      record.apiKey,
      record.model,
      record.reasoningEffort,
      record.endpoint,
      record.ip,
      t(`pages.account.sections.usage.requestTypes.${record.requestType}`),
      t(`pages.account.sections.usage.billingModes.${record.billingMode}`),
      record.inputTokens + record.outputTokens + record.cacheTokens,
      record.costUsd,
      record.durationMs,
      record.createdAt,
    ]);
    const csv = [
      [t('pages.account.sections.usage.columns.apiKey'), ...headers].join(','),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'modelmesh-usage.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <UsageSummaryCards />
      <UsageTimeControls />
      <UsageAnalytics />
      <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-sm">
        <div className="border-b border-border px-4 py-4">
          <h2 className="font-semibold tracking-[-0.02em]">
            {t('pages.account.sections.usage.recordsTitle')}
          </h2>
          <p className="mt-1 max-w-full break-words text-xs leading-5 text-muted-foreground">
            {t('pages.account.sections.usage.recordsDescription')}
          </p>
        </div>
        <UsageRecordsToolbar
          filters={filters}
          isRefreshing={isRefreshing}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onExport={handleExport}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
          onReset={handleReset}
          visibleColumns={visibleColumns}
        />
        <UsageRecordsTable
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSize={pageSize}
          records={visibleRecords}
          totalResults={totalResults}
          visibleColumns={visibleColumns}
        />
      </Card>
    </div>
  );
}
