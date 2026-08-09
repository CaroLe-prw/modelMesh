import { useTranslation } from 'react-i18next';
import type { ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';

interface ApiKeyIpRulesProps {
  enabled: boolean;
  value: string;
}

interface RateLimitWindow {
  labelKey: string;
  limit: number;
  usage: number;
}

export function ApiKeyIpRules({ enabled, value }: ApiKeyIpRulesProps) {
  const { t } = useTranslation();
  const rules = value
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean);

  if (!enabled) {
    return (
      <span className="text-xs text-muted-foreground">
        {t('pages.account.sections.apiKeys.ipRestrictionDisabled')}
      </span>
    );
  }
  if (rules.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const visibleRules = rules.slice(0, 2);

  return (
    <span className="grid min-w-0 gap-1" title={rules.join('\n')}>
      {visibleRules.map((rule, index) => (
        <code
          className="block max-w-full truncate rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]"
          key={`${rule}-${index}`}
        >
          {rule}
        </code>
      ))}
      {rules.length > visibleRules.length && (
        <small className="text-[11px] text-muted-foreground">
          {t('pages.account.sections.apiKeys.moreIpRules', {
            count: rules.length - visibleRules.length,
          })}
        </small>
      )}
    </span>
  );
}

export function ApiKeyRateLimits({ apiKey }: { apiKey: ApiKeyItem }) {
  const { i18n, t } = useTranslation();
  const currencyFormatter = new Intl.NumberFormat(i18n.language, {
    currency: 'USD',
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: 'currency',
  });

  if (!apiKey.rateLimitEnabled) {
    return (
      <span className="text-xs text-muted-foreground">
        {t('pages.account.sections.apiKeys.rateLimits.disabled')}
      </span>
    );
  }

  const windows: RateLimitWindow[] = [
    {
      labelKey: 'pages.account.sections.apiKeys.rateLimits.fiveHours',
      limit: apiKey.fiveHourLimitUsd,
      usage: apiKey.fiveHourUsageUsd ?? 0,
    },
    {
      labelKey: 'pages.account.sections.apiKeys.rateLimits.oneDay',
      limit: apiKey.dailyLimitUsd,
      usage: apiKey.dailyUsageUsd ?? 0,
    },
    {
      labelKey: 'pages.account.sections.apiKeys.rateLimits.sevenDays',
      limit: apiKey.weeklyLimitUsd,
      usage: apiKey.weeklyUsageUsd ?? 0,
    },
  ];

  return (
    <span className="grid min-w-[190px] gap-2 font-mono text-[11px] tabular-nums">
      {windows.map((window) => {
        const progress = window.limit > 0 ? Math.min(100, (window.usage / window.limit) * 100) : 0;

        return (
          <span className="grid gap-1" key={window.labelKey}>
            <span className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t(window.labelKey)}</span>
              <span>
                {currencyFormatter.format(window.usage)} /{' '}
                {window.limit > 0
                  ? currencyFormatter.format(window.limit)
                  : t('pages.account.sections.apiKeys.rateLimits.unlimited')}
              </span>
            </span>
            <span className="h-1 overflow-hidden rounded-full bg-secondary">
              <span
                aria-hidden="true"
                className="block h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
