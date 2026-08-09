import { ArrowDown, ArrowUp, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataPagination } from '@/components/common/data-pagination';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  UsageOptionalColumnId,
  UsageRecord,
} from '@/features/account/components/usage/usage-data';

interface UsageRecordsTableProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  records: UsageRecord[];
  totalResults: number;
  visibleColumns: ReadonlySet<UsageOptionalColumnId>;
}

function formatTokens(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function latencyClassName(durationMs: number) {
  if (durationMs >= 30_000) {
    return 'text-destructive';
  }
  if (durationMs >= 12_000) {
    return 'text-warning';
  }
  return 'text-success';
}

export function UsageRecordsTable({
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  records,
  totalResults,
  visibleColumns,
}: UsageRecordsTableProps) {
  const { t } = useTranslation();

  if (records.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
        <div>
          <span className="mx-auto grid size-11 place-items-center rounded-lg bg-secondary text-muted-foreground">
            <Database aria-hidden="true" className="size-5" />
          </span>
          <strong className="mt-3 block text-sm">
            {t('pages.account.sections.usage.empty.title')}
          </strong>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.usage.empty.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground md:hidden">
        {t('pages.account.sections.usage.horizontalScrollHint')}
      </div>
      <Table className="min-w-[1320px]">
        <TableCaption className="sr-only">
          {t('pages.account.sections.usage.tableCaption')}
        </TableCaption>
        <TableHeader className="bg-card">
          <TableRow className="hover:bg-card">
            <TableHead className="sticky left-0 z-20 h-11 min-w-[132px] border-r border-border/70 bg-card px-4 text-xs text-muted-foreground shadow-[12px_0_22px_-14px_color-mix(in_srgb,var(--color-text)_24%,transparent)]">
              {t('pages.account.sections.usage.columns.apiKey')}
            </TableHead>
            {visibleColumns.has('model') && (
              <TableHead className="min-w-[144px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.model')}
              </TableHead>
            )}
            {visibleColumns.has('reasoningEffort') && (
              <TableHead className="min-w-[100px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.reasoningEffort')}
              </TableHead>
            )}
            {visibleColumns.has('endpoint') && (
              <TableHead className="min-w-[175px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.endpoint')}
              </TableHead>
            )}
            {visibleColumns.has('ip') && (
              <TableHead className="min-w-[126px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.ip')}
              </TableHead>
            )}
            {visibleColumns.has('requestType') && (
              <TableHead className="min-w-[86px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.requestType')}
              </TableHead>
            )}
            {visibleColumns.has('billingMode') && (
              <TableHead className="min-w-[86px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.billingMode')}
              </TableHead>
            )}
            {visibleColumns.has('tokens') && (
              <TableHead className="min-w-[150px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.tokens')}
              </TableHead>
            )}
            {visibleColumns.has('cost') && (
              <TableHead className="min-w-[110px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.cost')}
              </TableHead>
            )}
            {visibleColumns.has('latency') && (
              <TableHead className="min-w-[132px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.latency')}
              </TableHead>
            )}
            {visibleColumns.has('createdAt') && (
              <TableHead className="min-w-[164px] text-xs text-muted-foreground">
                {t('pages.account.sections.usage.columns.createdAt')}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow className="group h-[70px]" key={`${currentPage}-${record.id}-${index}`}>
              <TableCell className="sticky left-0 z-[2] border-r border-border/70 bg-card px-4 font-medium shadow-[12px_0_22px_-14px_color-mix(in_srgb,var(--color-text)_24%,transparent)] transition-colors group-hover:bg-muted/50">
                {record.apiKey}
              </TableCell>
              {visibleColumns.has('model') && (
                <TableCell className="font-medium">{record.model}</TableCell>
              )}
              {visibleColumns.has('reasoningEffort') && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {record.reasoningEffort}
                </TableCell>
              )}
              {visibleColumns.has('endpoint') && (
                <TableCell>
                  <code className="font-mono text-xs text-muted-foreground">{record.endpoint}</code>
                </TableCell>
              )}
              {visibleColumns.has('ip') && (
                <TableCell>
                  <span className="grid gap-0.5">
                    <code className="font-mono text-xs">{record.ip}</code>
                    <small className="text-[11px] text-primary">
                      {t('pages.account.sections.usage.ipLocation')}
                    </small>
                  </span>
                </TableCell>
              )}
              {visibleColumns.has('requestType') && (
                <TableCell>
                  <Badge className="border-primary/20 bg-primary/8 text-primary" variant="outline">
                    {t(`pages.account.sections.usage.requestTypes.${record.requestType}`)}
                  </Badge>
                </TableCell>
              )}
              {visibleColumns.has('billingMode') && (
                <TableCell>
                  <Badge variant="secondary">
                    {t(`pages.account.sections.usage.billingModes.${record.billingMode}`)}
                  </Badge>
                </TableCell>
              )}
              {visibleColumns.has('tokens') && (
                <TableCell>
                  <span className="grid gap-0.5 font-mono text-xs tabular-nums">
                    <span className="flex items-center gap-1 text-success">
                      <ArrowDown aria-hidden="true" className="size-3" />
                      {formatTokens(record.inputTokens)}
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.usage.tokens.inputShort')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-chart-4">
                      <ArrowUp aria-hidden="true" className="size-3" />
                      {formatTokens(record.outputTokens)}
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.usage.tokens.outputShort')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Database aria-hidden="true" className="size-3" />
                      {formatTokens(record.cacheTokens)}
                    </span>
                  </span>
                </TableCell>
              )}
              {visibleColumns.has('cost') && (
                <TableCell className="font-mono text-xs font-medium tabular-nums text-success">
                  US${record.costUsd.toFixed(6)}
                </TableCell>
              )}
              {visibleColumns.has('latency') && (
                <TableCell>
                  <span
                    className={`grid gap-0.5 font-mono text-xs tabular-nums ${latencyClassName(record.durationMs)}`}
                  >
                    <span>
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.usage.latency.firstToken')}
                      </span>{' '}
                      {record.firstTokenMs === null
                        ? '—'
                        : `${(record.firstTokenMs / 1000).toFixed(2)}s`}
                    </span>
                    <span>
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.usage.latency.total')}
                      </span>{' '}
                      {(record.durationMs / 1000).toFixed(2)}s
                    </span>
                  </span>
                </TableCell>
              )}
              {visibleColumns.has('createdAt') && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {record.createdAt}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DataPagination
        metadata={{
          page: currentPage,
          pageSize,
          total: totalResults,
          totalPages: Math.ceil(totalResults / pageSize),
        }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
