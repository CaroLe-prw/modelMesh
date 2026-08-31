import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

interface ApiKeysMobileListProps {
  apiKeys: ApiKeyItem[];
  copiedKeyId: string | null;
  disabled?: boolean;
  onCopy: (apiKey: ApiKeyItem) => void;
  onDelete: (apiKey: ApiKeyItem) => void;
  onEdit: (apiKey: ApiKeyItem) => void;
  onToggleStatus: (apiKey: ApiKeyItem) => void;
  visibleColumns: ReadonlySet<ApiKeyOptionalColumnId>;
}

interface MobileDetailProps {
  label: string;
  value: ReactNode;
}

function MobileDetail({ label, value }: MobileDetailProps) {
  return (
    <div className="min-w-0 rounded-md bg-secondary/50 p-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 text-xs font-medium">{value}</dd>
    </div>
  );
}

export function ApiKeysMobileList({
  apiKeys,
  copiedKeyId,
  disabled = false,
  onCopy,
  onDelete,
  onEdit,
  onToggleStatus,
  visibleColumns,
}: ApiKeysMobileListProps) {
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
    second: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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
    <div className="divide-y divide-border md:hidden">
      {apiKeys.map((apiKey) => (
        <article className="p-4" key={apiKey.id}>
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{apiKey.name}</h3>
              <div className="mt-2 max-w-full">
                <ApiKeyMaskedValue
                  apiKey={apiKey}
                  copied={copiedKeyId === apiKey.id}
                  onCopy={onCopy}
                />
              </div>
            </div>
            <ApiKeyStatusBadge status={apiKey.status} />
          </header>

          <dl className="mt-4 grid grid-cols-2 gap-2">
            {visibleColumns.has('concurrency') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.concurrency')}
                value={<span className="font-mono tabular-nums">{apiKey.concurrency}</span>}
              />
            )}
            {visibleColumns.has('usage') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.usage')}
                value={
                  <span className="grid gap-0.5 font-mono tabular-nums">
                    <span>
                      {t('pages.account.sections.apiKeys.today')}{' '}
                      {currencyFormatter.format(apiKey.usageToday)}
                    </span>
                    <span>
                      {t('pages.account.sections.apiKeys.last30Days')}{' '}
                      {currencyFormatter.format(apiKey.usageLast30Days)}
                    </span>
                  </span>
                }
              />
            )}
            {visibleColumns.has('rateLimits') && (
              <div className="col-span-2">
                <MobileDetail
                  label={t('pages.account.sections.apiKeys.columns.rateLimits')}
                  value={<ApiKeyRateLimits apiKey={apiKey} />}
                />
              </div>
            )}
            {visibleColumns.has('expiry') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.expiry')}
                value={
                  apiKey.expiresAt
                    ? dateFormatter.format(new Date(apiKey.expiresAt))
                    : t('pages.account.sections.apiKeys.permanent')
                }
              />
            )}
            {visibleColumns.has('lastUsedAt') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.lastUsedAt')}
                value={apiKey.lastUsedAt ? dateFormatter.format(new Date(apiKey.lastUsedAt)) : '—'}
              />
            )}
            {visibleColumns.has('lastUsedIp') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.lastUsedIp')}
                value={<span className="font-mono tabular-nums">{apiKey.lastUsedIp ?? '—'}</span>}
              />
            )}
            {visibleColumns.has('ipWhitelist') && (
              <div className="col-span-2">
                <MobileDetail
                  label={t('pages.account.sections.apiKeys.columns.ipWhitelist')}
                  value={
                    <ApiKeyIpRules
                      enabled={apiKey.ipRestrictionEnabled}
                      value={apiKey.ipWhitelist}
                    />
                  }
                />
              </div>
            )}
            {visibleColumns.has('ipBlacklist') && (
              <div className="col-span-2">
                <MobileDetail
                  label={t('pages.account.sections.apiKeys.columns.ipBlacklist')}
                  value={
                    <ApiKeyIpRules
                      enabled={apiKey.ipRestrictionEnabled}
                      value={apiKey.ipBlacklist}
                    />
                  }
                />
              </div>
            )}
            {visibleColumns.has('createdAt') && (
              <MobileDetail
                label={t('pages.account.sections.apiKeys.columns.createdAt')}
                value={dateFormatter.format(new Date(apiKey.createdAt))}
              />
            )}
          </dl>

          <div className="mt-3 flex justify-end border-t border-border pt-2">
            <ApiKeyActions
              apiKey={apiKey}
              disabled={disabled}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
