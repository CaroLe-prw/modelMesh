import { Search, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
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

export interface AdminDataColumn<T> {
  className?: string;
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sticky?: 'left' | 'right';
}

export interface AdminMobileField<T> {
  className?: string;
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export function AdminFilterToolbar({
  children,
  onQueryChange,
  placeholder,
  query,
}: {
  children?: ReactNode;
  onQueryChange: (query: string) => void;
  placeholder: string;
  query: string;
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={placeholder}
            className="pl-9"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            value={query}
          />
        </div>
        {children}
      </div>
    </Card>
  );
}

export function AdminDataList<T>({
  caption,
  columns,
  emptyIcon: EmptyIcon,
  emptyText,
  getKey,
  items,
  mobileFields,
  mobileHeader,
  notice,
}: {
  caption: string;
  columns: AdminDataColumn<T>[];
  emptyIcon: LucideIcon;
  emptyText: string;
  getKey: (item: T) => string;
  items: T[];
  mobileFields: AdminMobileField<T>[];
  mobileHeader: (item: T) => ReactNode;
  notice?: string | null;
}) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
        <EmptyIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <strong className="mt-4 text-sm">{emptyText}</strong>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              {columns.map((column) => (
                <TableHead
                  className={cn(column.className, stickyColumnClass(column.sticky, true))}
                  key={column.key}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow className="group h-16" key={getKey(item)}>
                {columns.map((column) => (
                  <TableCell
                    className={cn(column.className, stickyColumnClass(column.sticky, false))}
                    key={column.key}
                  >
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Card className="gap-4 p-4 shadow-sm" key={getKey(item)}>
            {mobileHeader(item)}
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

      {notice !== null && (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          {notice ?? t('pages.account.sections.admin.previewNotice')}
        </p>
      )}
    </>
  );
}

function stickyColumnClass(sticky: AdminDataColumn<unknown>['sticky'], header: boolean) {
  if (sticky === 'left') {
    return header
      ? 'sticky left-0 z-30 border-r border-border bg-secondary'
      : 'sticky left-0 z-20 border-r border-border bg-card group-hover:bg-muted';
  }
  if (sticky === 'right') {
    return header
      ? 'sticky right-0 z-30 border-l border-border bg-secondary'
      : 'sticky right-0 z-20 border-l border-border bg-card group-hover:bg-muted';
  }
  return undefined;
}
