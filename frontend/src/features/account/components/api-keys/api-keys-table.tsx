import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiKeyActions } from '@/features/account/components/api-keys/api-key-actions';
import {
  ApiKeyMaskedValue,
  ApiKeyStatusBadge,
} from '@/features/account/components/api-keys/api-key-display';
import {
  ApiKeyIpRules,
  ApiKeyRateLimits,
} from '@/features/account/components/api-keys/api-key-metadata';
import type {
  ApiKeyItem,
  ApiKeyOptionalColumnId,
} from '@/features/account/components/api-keys/api-key-types';

const columnWidths: Record<ApiKeyOptionalColumnId, number> = {
  key: 220,
  concurrency: 100,
  usage: 190,
  rateLimits: 230,
  expiry: 130,
  status: 100,
  lastUsedAt: 160,
  lastUsedIp: 140,
  ipWhitelist: 210,
  ipBlacklist: 210,
  createdAt: 160,
};

interface ApiKeysTableProps {
  apiKeys: ApiKeyItem[];
  copiedKeyId: string | null;
  disabled?: boolean;
  onCopy: (apiKey: ApiKeyItem) => void;
  onDelete: (apiKey: ApiKeyItem) => void;
  onEdit: (apiKey: ApiKeyItem) => void;
  onToggleStatus: (apiKey: ApiKeyItem) => void;
  visibleColumns: ReadonlySet<ApiKeyOptionalColumnId>;
}

export function ApiKeysTable({
  apiKeys,
  copiedKeyId,
  disabled = false,
  onCopy,
  onDelete,
  onEdit,
  onToggleStatus,
  visibleColumns,
}: ApiKeysTableProps) {
  const { i18n, t } = useTranslation();
  const currencyFormatter = new Intl.NumberFormat(i18n.language, {
    currency: 'USD',
    minimumFractionDigits: 4,
    style: 'currency',
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const tableMinWidth = Math.max(
    520,
    308 + Array.from(visibleColumns).reduce((total, column) => total + columnWidths[column], 0),
  );

  if (apiKeys.length === 0) {
    return (
      <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
        <div>
          <strong className="text-sm">{t('pages.account.sections.apiKeys.emptyTitle')}</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.apiKeys.emptyDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Table style={{ minWidth: tableMinWidth }}>
        <TableCaption className="sr-only">
          {t('pages.account.sections.apiKeys.tableCaption')}
        </TableCaption>
        <TableHeader className="bg-card">
          <TableRow className="hover:bg-card">
            <TableHead className="h-11 w-[140px] min-w-[140px] bg-card px-4 text-xs text-muted-foreground">
              {t('pages.account.sections.apiKeys.columns.name')}
            </TableHead>
            {visibleColumns.has('key') && (
              <TableHead className="h-11 min-w-[220px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.key')}
              </TableHead>
            )}
            {visibleColumns.has('concurrency') && (
              <TableHead className="h-11 min-w-[100px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.concurrency')}
              </TableHead>
            )}
            {visibleColumns.has('usage') && (
              <TableHead className="h-11 min-w-[190px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.usage')}
              </TableHead>
            )}
            {visibleColumns.has('rateLimits') && (
              <TableHead className="h-11 min-w-[230px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.rateLimits')}
              </TableHead>
            )}
            {visibleColumns.has('expiry') && (
              <TableHead className="h-11 min-w-[130px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.expiry')}
              </TableHead>
            )}
            {visibleColumns.has('status') && (
              <TableHead className="h-11 min-w-[100px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.status')}
              </TableHead>
            )}
            {visibleColumns.has('lastUsedAt') && (
              <TableHead className="h-11 min-w-[160px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.lastUsedAt')}
              </TableHead>
            )}
            {visibleColumns.has('lastUsedIp') && (
              <TableHead className="h-11 min-w-[140px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.lastUsedIp')}
              </TableHead>
            )}
            {visibleColumns.has('ipWhitelist') && (
              <TableHead className="h-11 min-w-[210px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.ipWhitelist')}
              </TableHead>
            )}
            {visibleColumns.has('ipBlacklist') && (
              <TableHead className="h-11 min-w-[210px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.ipBlacklist')}
              </TableHead>
            )}
            {visibleColumns.has('createdAt') && (
              <TableHead className="h-11 min-w-[160px] text-xs text-muted-foreground">
                {t('pages.account.sections.apiKeys.columns.createdAt')}
              </TableHead>
            )}
            <TableHead className="h-11 w-[168px] min-w-[168px] bg-card pr-4 text-xs text-muted-foreground">
              {t('pages.account.sections.apiKeys.columns.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow className="group h-[62px]" key={apiKey.id}>
              <TableCell className="bg-card px-4 font-medium transition-colors group-hover:bg-muted/50">
                {apiKey.name}
              </TableCell>
              {visibleColumns.has('key') && (
                <TableCell>
                  <ApiKeyMaskedValue
                    apiKey={apiKey}
                    copied={copiedKeyId === apiKey.id}
                    onCopy={onCopy}
                  />
                </TableCell>
              )}
              {visibleColumns.has('concurrency') && (
                <TableCell className="text-center">
                  <span className="inline-flex min-w-7 justify-center rounded-md bg-secondary px-2 py-1 font-mono text-xs font-semibold">
                    {apiKey.concurrency}
                  </span>
                </TableCell>
              )}
              {visibleColumns.has('usage') && (
                <TableCell>
                  <span className="grid gap-0.5 font-mono text-xs tabular-nums">
                    <span>
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.apiKeys.today')}
                      </span>{' '}
                      {currencyFormatter.format(apiKey.usageToday)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">
                        {t('pages.account.sections.apiKeys.last30Days')}
                      </span>{' '}
                      {currencyFormatter.format(apiKey.usageLast30Days)}
                    </span>
                  </span>
                </TableCell>
              )}
              {visibleColumns.has('rateLimits') && (
                <TableCell>
                  <ApiKeyRateLimits apiKey={apiKey} />
                </TableCell>
              )}
              {visibleColumns.has('expiry') && (
                <TableCell className="text-xs text-muted-foreground">
                  {apiKey.expiresAt
                    ? dateFormatter.format(new Date(apiKey.expiresAt))
                    : t('pages.account.sections.apiKeys.permanent')}
                </TableCell>
              )}
              {visibleColumns.has('status') && (
                <TableCell>
                  <ApiKeyStatusBadge status={apiKey.status} />
                </TableCell>
              )}
              {visibleColumns.has('lastUsedAt') && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {apiKey.lastUsedAt ? dateFormatter.format(new Date(apiKey.lastUsedAt)) : '—'}
                </TableCell>
              )}
              {visibleColumns.has('lastUsedIp') && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {apiKey.lastUsedIp ?? '—'}
                </TableCell>
              )}
              {visibleColumns.has('ipWhitelist') && (
                <TableCell className="max-w-[210px]">
                  <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipWhitelist} />
                </TableCell>
              )}
              {visibleColumns.has('ipBlacklist') && (
                <TableCell className="max-w-[210px]">
                  <ApiKeyIpRules enabled={apiKey.ipRestrictionEnabled} value={apiKey.ipBlacklist} />
                </TableCell>
              )}
              {visibleColumns.has('createdAt') && (
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(apiKey.createdAt))}
                </TableCell>
              )}
              <TableCell className="bg-card pr-4 transition-colors group-hover:bg-muted/50">
                <ApiKeyActions
                  apiKey={apiKey}
                  disabled={disabled}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className="sr-only" aria-live="polite">
        {copiedKeyId ? t('pages.account.sections.apiKeys.copyFeedback') : ''}
      </span>
    </>
  );
}
