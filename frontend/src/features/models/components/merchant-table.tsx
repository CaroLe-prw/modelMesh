import { useMemo, useState } from 'react';
import { Pin, Route, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SignalBars } from '@/components/common/signal-bars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatUsd,
  merchantTemplates,
  type CatalogModel,
  type MerchantTag,
} from '../data/marketplace';

type SortMode = 'success' | 'price' | 'latency';

const merchantHeadings = [
  'merchant',
  'input',
  'output',
  'rate',
  'success',
  'latency',
  'tags',
  'recent',
  'action',
];

const tagClasses: Record<MerchantTag, string> = {
  stable: 'border-success/20 bg-success/8 text-success',
  lowCost: 'border-primary/20 bg-primary/8 text-primary',
  fast: 'border-warning/25 bg-warning/8 text-warning',
  quality: 'border-border bg-secondary text-foreground',
};

interface MerchantTableProps {
  model: CatalogModel;
}

export function MerchantTable({ model }: MerchantTableProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [healthyOnly, setHealthyOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('success');
  const [pinnedMerchantId, setPinnedMerchantId] = useState<string>();
  const [routeMerchantIds, setRouteMerchantIds] = useState<Set<string>>(() => new Set());

  const visibleMerchants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = merchantTemplates.filter((merchant) => {
      const description = t(
        `pages.models.merchants.descriptions.${merchant.descriptionKey}`,
      ).toLowerCase();
      const localizedTags = merchant.tags
        .map((tag) => t(`pages.models.merchants.tags.${tag}`))
        .join(' ')
        .toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        `${merchant.name} ${description} ${localizedTags}`.toLowerCase().includes(normalizedQuery);
      const matchesHealth = !healthyOnly || merchant.successRate >= 90;

      return matchesQuery && matchesHealth;
    });

    return result.toSorted((first, second) => {
      if (sortMode === 'price') {
        return first.priceFactor - second.priceFactor;
      }

      if (sortMode === 'latency') {
        return first.latency - second.latency;
      }

      return second.successRate - first.successRate;
    });
  }, [healthyOnly, query, sortMode, t]);

  const toggleRouteMerchant = (merchantId: string) => {
    setRouteMerchantIds((current) => {
      const next = new Set(current);

      if (next.has(merchantId)) {
        next.delete(merchantId);
      } else {
        next.add(merchantId);
      }

      return next;
    });
  };

  return (
    <section>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_55px_color-mix(in_srgb,var(--color-text)_6%,transparent)]">
        <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 lg:max-w-xs">
            <Search aria-hidden="true" className="size-4 text-muted-foreground" />
            <input
              aria-label={t('pages.models.merchants.searchPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={t('pages.models.merchants.searchPlaceholder')}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            <select
              aria-label={t(`pages.models.merchants.sort.${sortMode}`)}
              className="border-0 bg-transparent text-xs font-semibold text-foreground outline-none"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="success">{t('pages.models.merchants.sort.success')}</option>
              <option value="price">{t('pages.models.merchants.sort.price')}</option>
              <option value="latency">{t('pages.models.merchants.sort.latency')}</option>
            </select>
          </label>

          <Button
            aria-pressed={healthyOnly}
            className="lg:ml-auto"
            variant={healthyOnly ? 'soft' : 'outline'}
            onClick={() => setHealthyOnly((current) => !current)}
          >
            <span className="size-2 rounded-full bg-success" />
            {t('pages.models.merchants.healthyOnly')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="model-table w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="bg-secondary/65">
                {merchantHeadings.map((heading) => (
                  <th
                    className="h-10 border-b border-border px-3 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground first:pl-5 last:pr-5"
                    key={heading}
                  >
                    {t(`pages.models.merchants.columns.${heading}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleMerchants.map((merchant) => {
                const isPinned = pinnedMerchantId === merchant.id;
                const isInRoute = routeMerchantIds.has(merchant.id);

                return (
                  <tr key={merchant.id}>
                    <td className="h-18 border-b border-border px-3 pl-5 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg border border-border bg-secondary font-mono text-[10px] font-bold text-primary">
                          {merchant.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-xs">{merchant.name}</strong>
                          <small className="mt-1 block max-w-48 truncate text-[9px] text-muted-foreground">
                            {t(`pages.models.merchants.descriptions.${merchant.descriptionKey}`)}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td className="h-18 border-b border-border px-3 font-mono text-[10px] font-semibold transition-colors">
                      {formatUsd(model.inputFrom * merchant.priceFactor)}
                    </td>
                    <td className="h-18 border-b border-border px-3 font-mono text-[10px] font-semibold transition-colors">
                      {formatUsd(model.outputFrom * merchant.priceFactor)}
                    </td>
                    <td className="h-18 border-b border-border px-3 transition-colors">
                      <span className="inline-flex min-w-16 justify-center rounded-full border border-primary/20 bg-primary/8 px-2 py-1.5 font-mono text-[9px] font-bold text-primary">
                        {merchant.realtimeRate.toFixed(4)}
                      </span>
                    </td>
                    <td className="h-18 border-b border-border px-3 transition-colors">
                      <div className="flex items-center gap-2">
                        <SignalBars signals={merchant.signals} />
                        <strong
                          className={cn(
                            'font-mono text-[10px]',
                            merchant.successRate >= 90 ? 'text-success' : 'text-warning',
                          )}
                        >
                          {merchant.successRate}%
                        </strong>
                      </div>
                    </td>
                    <td className="h-18 border-b border-border px-3 font-mono text-[10px] text-muted-foreground transition-colors">
                      {merchant.latency.toFixed(2)}s
                    </td>
                    <td className="h-18 border-b border-border px-3 transition-colors">
                      <div className="flex max-w-30 flex-wrap gap-1">
                        {merchant.tags.map((tag) => (
                          <Badge className={cn('h-5 px-2 text-[8px]', tagClasses[tag])} key={tag}>
                            {t(`pages.models.merchants.tags.${tag}`)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="h-18 border-b border-border px-3 text-[10px] text-muted-foreground transition-colors">
                      {t(`pages.models.merchants.lastSuccess.${merchant.lastSuccessKey}`)}
                    </td>
                    <td className="h-18 border-b border-border px-3 pr-5 transition-colors">
                      <div className="flex min-w-60 justify-end gap-2.5">
                        <Button
                          className="h-10 min-w-28 rounded-lg px-4 text-[11px]"
                          variant={isPinned ? 'soft' : 'outline'}
                          onClick={() =>
                            setPinnedMerchantId((current) =>
                              current === merchant.id ? undefined : merchant.id,
                            )
                          }
                        >
                          <Pin aria-hidden="true" className="size-3.5" />
                          {t(
                            isPinned
                              ? 'pages.models.merchants.pinned'
                              : 'pages.models.merchants.pin',
                          )}
                        </Button>
                        <Button
                          className="h-10 min-w-28 rounded-lg px-4 text-[11px]"
                          variant={isInRoute ? 'outline' : 'primary'}
                          onClick={() => toggleRouteMerchant(merchant.id)}
                        >
                          <Route aria-hidden="true" className="size-3.5" />
                          {t(
                            isInRoute
                              ? 'pages.models.merchants.inRoute'
                              : 'pages.models.merchants.addRoute',
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleMerchants.length === 0 && (
          <div className="border-t border-border px-5 py-12 text-center text-xs text-muted-foreground">
            {t('pages.models.merchants.empty')}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border bg-secondary/45 px-5 py-3 text-[10px] text-muted-foreground">
          <span>{model.name}</span>
          <span className="font-mono">
            {t('pages.models.merchants.count', {
              visible: visibleMerchants.length,
              total: merchantTemplates.length,
            })}
          </span>
        </div>
      </div>
    </section>
  );
}
