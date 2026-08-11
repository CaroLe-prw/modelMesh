import { ScrollText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatMerchantDate,
  formatUsd,
  merchantUsageLogs,
  type MerchantUsageLog,
  type MerchantUsageStatus,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

type UsageStatusFilter = 'all' | MerchantUsageStatus;
const usageStatusFilters: UsageStatusFilter[] = ['all', 'succeeded', 'failed'];

export function MerchantUsageLogsPanel() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<UsageStatusFilter>('all');
  const visibleLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return merchantUsageLogs.filter((log) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        log.id.toLocaleLowerCase().includes(normalizedQuery) ||
        log.model.toLocaleLowerCase().includes(normalizedQuery) ||
        log.apiKey.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || log.status === status);
    });
  }, [query, status]);

  return (
    <div className="grid min-w-0 gap-3">
      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t('pages.account.sections.merchant.usageLogs.search')}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('pages.account.sections.merchant.usageLogs.search')}
              value={query}
            />
          </div>
          <Select onValueChange={(value) => setStatus(value as UsageStatusFilter)} value={status}>
            <SelectTrigger
              aria-label={t('pages.account.sections.merchant.usageLogs.statusFilter')}
              className="w-full md:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {usageStatusFilters.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.account.sections.merchant.usageLogs.statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">
            {t('pages.account.sections.merchant.usageLogs.caption')}
          </TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              <TableHead className="h-12 min-w-40 px-4">
                {t('pages.account.sections.merchant.usageLogs.columns.request')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.usageLogs.columns.model')}</TableHead>
              <TableHead>{t('pages.account.sections.merchant.usageLogs.columns.apiKey')}</TableHead>
              <TableHead>{t('pages.account.sections.merchant.usageLogs.columns.tokens')}</TableHead>
              <TableHead>{t('pages.account.sections.merchant.usageLogs.columns.cost')}</TableHead>
              <TableHead>
                {t('pages.account.sections.merchant.usageLogs.columns.latency')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.usageLogs.columns.status')}</TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.usageLogs.columns.createdAt')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLogs.map((log) => (
              <UsageLogTableRow key={log.id} log={log} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {visibleLogs.map((log) => (
          <UsageLogMobileCard key={log.id} log={log} />
        ))}
      </div>

      {visibleLogs.length === 0 ? (
        <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
          <ScrollText aria-hidden="true" className="size-6 text-muted-foreground" />
          <strong className="mt-4 text-sm">
            {t('pages.account.sections.merchant.usageLogs.empty')}
          </strong>
        </Card>
      ) : null}
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}

function UsageLogTableRow({ log }: { log: MerchantUsageLog }) {
  const { i18n } = useTranslation();

  return (
    <TableRow className="h-16">
      <TableCell className="px-4 font-mono text-xs font-semibold">{log.id}</TableCell>
      <TableCell className="font-mono text-xs">{log.model}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{log.apiKey}</TableCell>
      <TableCell className="font-mono">
        {log.tokens.toLocaleString(i18n.resolvedLanguage)}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {formatUsd(i18n.resolvedLanguage, log.cost)}
      </TableCell>
      <TableCell className="font-mono">
        {log.latencyMs.toLocaleString(i18n.resolvedLanguage)} ms
      </TableCell>
      <TableCell>
        <MerchantStatusBadge namespace="usageLogs" status={log.status} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
      </TableCell>
    </TableRow>
  );
}

function UsageLogMobileCard({ log }: { log: MerchantUsageLog }) {
  const { i18n, t } = useTranslation();

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="block truncate font-mono text-xs font-semibold">{log.id}</code>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{log.model}</span>
        </div>
        <MerchantStatusBadge namespace="usageLogs" status={log.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/45 p-3 text-xs">
        <LogMetric
          label={t('pages.account.sections.merchant.usageLogs.columns.tokens')}
          value={log.tokens.toLocaleString(i18n.resolvedLanguage)}
        />
        <LogMetric
          label={t('pages.account.sections.merchant.usageLogs.columns.cost')}
          value={formatUsd(i18n.resolvedLanguage, log.cost)}
        />
        <LogMetric
          label={t('pages.account.sections.merchant.usageLogs.columns.latency')}
          value={`${log.latencyMs.toLocaleString(i18n.resolvedLanguage)} ms`}
        />
        <LogMetric
          label={t('pages.account.sections.merchant.usageLogs.columns.apiKey')}
          value={log.apiKey}
        />
      </dl>
      <p className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, log.createdAt)}
      </p>
    </Card>
  );
}

function LogMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono font-semibold">{value}</dd>
    </div>
  );
}
