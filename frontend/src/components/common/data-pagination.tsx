import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PAGE_SIZE_OPTIONS, paginationEntries, type PaginationMetadata } from '@/lib/pagination';

interface DataPaginationProps {
  disabled?: boolean;
  metadata: PaginationMetadata;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataPagination({
  disabled = false,
  metadata,
  onPageChange,
  onPageSizeChange,
}: DataPaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, metadata.totalPages);
  const firstItem = metadata.total === 0 ? 0 : (metadata.page - 1) * metadata.pageSize + 1;
  const lastItem = Math.min(metadata.page * metadata.pageSize, metadata.total);
  const entries = paginationEntries(metadata.page, totalPages);

  function changePage(page: number) {
    if (!disabled && page !== metadata.page && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  }

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-xs text-muted-foreground sm:px-4 sm:py-3"
      data-slot="data-pagination"
    >
      <div className="flex min-w-0 items-center gap-2 sm:flex-wrap sm:gap-3">
        <span className="shrink-0 sm:hidden">
          {t('common.pagination.total', { total: metadata.total.toLocaleString() })}
        </span>
        <span className="hidden sm:inline">
          {t('common.pagination.summary', {
            end: lastItem,
            start: firstItem,
            total: metadata.total.toLocaleString(),
          })}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {t('common.pagination.perPage')}
          <Select
            disabled={disabled}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            value={String(metadata.pageSize)}
          >
            <SelectTrigger
              aria-label={t('common.pagination.perPage')}
              className="h-8 w-16 px-2 text-xs sm:w-20 sm:px-3"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      </div>

      <Pagination
        aria-label={t('common.pagination.label')}
        className="mx-0 w-auto shrink-0 justify-end"
      >
        <PaginationContent className="gap-0.5 sm:gap-1">
          <PaginationItem>
            <PaginationLink
              aria-disabled={disabled || metadata.page <= 1}
              aria-label={t('common.pagination.previous')}
              className={
                disabled || metadata.page <= 1 ? 'pointer-events-none opacity-50' : undefined
              }
              href="#"
              onClick={(event) => {
                event.preventDefault();
                changePage(metadata.page - 1);
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </PaginationLink>
          </PaginationItem>

          {entries.map((entry) =>
            typeof entry === 'number' ? (
              <PaginationItem
                className={metadata.page === entry ? undefined : 'hidden sm:list-item'}
                key={entry}
              >
                <PaginationLink
                  aria-disabled={disabled}
                  className={cn(
                    disabled && 'pointer-events-none opacity-50',
                    metadata.page === entry &&
                      'border-transparent bg-secondary shadow-none sm:border-input sm:bg-background sm:shadow-xs',
                  )}
                  href="#"
                  isActive={metadata.page === entry}
                  onClick={(event) => {
                    event.preventDefault();
                    changePage(entry);
                  }}
                >
                  {entry}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem className="hidden sm:list-item" key={entry}>
                <PaginationEllipsis />
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationLink
              aria-disabled={disabled || metadata.page >= totalPages}
              aria-label={t('common.pagination.next')}
              className={
                disabled || metadata.page >= totalPages
                  ? 'pointer-events-none opacity-50'
                  : undefined
              }
              href="#"
              onClick={(event) => {
                event.preventDefault();
                changePage(metadata.page + 1);
              }}
            >
              <ChevronRight aria-hidden="true" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
