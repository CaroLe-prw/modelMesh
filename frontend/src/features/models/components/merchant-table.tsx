import {
  AlertCircle,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  Pin,
  RefreshCw,
  Route,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandAvatar } from '@/components/common/brand-avatar';
import { SignalBars } from '@/components/common/signal-bars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import {
  modelPricingGroups,
  orderedRateNames,
  priceGroupTitle,
  type PriceGroupView,
} from '@/features/account/components/admin/model-pricing';
import { cn } from '@/lib/utils';
import type { MarketplaceRouteState } from '../api/marketplace';
import {
  formatRelativeTime,
  formatMarketplacePrice,
  merchantSignals,
  merchantMatchesBillingMode,
  merchantMatchesId,
  merchantTags,
  sortMarketplaceMerchants,
  type CatalogModel,
  type MarketplaceDisplayCurrency,
  type MarketplaceMerchant,
  type MarketplacePricing,
  type MerchantBillingModeFilter,
  type MerchantSortMode,
  type MerchantTag,
  type ModelBrand,
} from '../data/marketplace';

const merchantHeadings = [
  'merchant',
  'billing',
  'pricing',
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
  billingModeFilter: MerchantBillingModeFilter;
  brand: ModelBrand;
  canConfigureRoute: boolean;
  merchantIdQuery: string;
  merchantSortMode: MerchantSortMode;
  merchants: MarketplaceMerchant[];
  model: CatalogModel;
  selectedDisplayCurrency: MarketplaceDisplayCurrency;
  pendingMerchantIds: ReadonlySet<string>;
  state: 'error' | 'loading' | 'ready';
  onRetry: () => void;
  onRouteChange: (merchantId: string, state: MarketplaceRouteState) => Promise<void>;
}

export function MerchantTable({
  billingModeFilter,
  brand,
  canConfigureRoute,
  merchantIdQuery,
  merchantSortMode,
  merchants,
  model,
  selectedDisplayCurrency,
  pendingMerchantIds,
  state,
  onRetry,
  onRouteChange,
}: MerchantTableProps) {
  const { i18n, t } = useTranslation();
  const [expandedMerchantId, setExpandedMerchantId] = useState<string | null>(null);

  const visibleMerchants = useMemo(() => {
    const filteredMerchants = merchants.filter((merchant) => {
      const matchesMerchantId = merchantMatchesId(merchant, merchantIdQuery);
      const matchesBillingMode = merchantMatchesBillingMode(merchant, billingModeFilter);

      return matchesMerchantId && matchesBillingMode;
    });

    return sortMarketplaceMerchants(filteredMerchants, merchantSortMode);
  }, [billingModeFilter, merchantIdQuery, merchantSortMode, merchants]);

  return (
    <section>
      <Card className="gap-0 overflow-hidden py-0 shadow-[0_18px_55px_color-mix(in_srgb,var(--color-text)_6%,transparent)]">
        {state === 'ready' && visibleMerchants.length > 0 ? (
          <>
            <div className="grid gap-3 p-3 sm:hidden">
              {visibleMerchants.map((merchant) => {
                const isPending = pendingMerchantIds.has(merchant.id);
                return (
                  <article
                    className="rounded-xl border border-border bg-background p-4"
                    key={merchant.id}
                  >
                    <MerchantIdentityTrigger
                      brand={brand}
                      expanded={expandedMerchantId === merchant.id}
                      merchant={merchant}
                      model={model}
                      onToggle={() =>
                        setExpandedMerchantId((current) =>
                          current === merchant.id ? null : merchant.id,
                        )
                      }
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge className="h-6 px-2.5 text-[10px]" variant="secondary">
                        {t(`pages.models.merchants.billingModes.${merchant.billingMode}`)}
                      </Badge>
                      <strong
                        className={cn(
                          'font-mono text-xs',
                          merchant.successRate >= 90 ? 'text-success' : 'text-warning',
                        )}
                      >
                        {merchant.successRate.toFixed(merchant.successRate % 1 === 0 ? 0 : 1)}%
                      </strong>
                    </div>

                    {merchant.billingMode === 'token' ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <MobilePrice
                          currency={selectedDisplayCurrency}
                          label={t('pages.models.merchants.columns.input')}
                          price={merchant.inputPrice}
                        />
                        <MobilePrice
                          currency={selectedDisplayCurrency}
                          label={t('pages.models.merchants.columns.output')}
                          price={merchant.outputPrice}
                        />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <MobilePrice
                          currency={selectedDisplayCurrency}
                          label={t('pages.models.merchants.columns.request')}
                          price={merchant.requestPrice}
                        />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <MerchantTags merchant={merchant} />
                      <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                        {(merchant.latencyMs / 1_000).toFixed(2)}s ·{' '}
                        {formatRelativeTime(merchant.healthUpdatedAt, i18n.language)}
                      </span>
                    </div>
                    <MerchantRouteActions
                      canConfigureRoute={canConfigureRoute}
                      compact
                      isPending={isPending}
                      merchant={merchant}
                      onRouteChange={onRouteChange}
                    />
                    {expandedMerchantId === merchant.id && (
                      <MerchantDetails
                        brand={brand}
                        className="mt-4"
                        currency={selectedDisplayCurrency}
                        merchant={merchant}
                      />
                    )}
                  </article>
                );
              })}
            </div>
            <div className="hidden sm:block">
              <Table className="model-table min-w-[1180px] border-collapse text-center">
                <TableHeader>
                  <TableRow className="bg-secondary/65 hover:bg-secondary/65">
                    {merchantHeadings.map((heading) => (
                      <TableHead
                        className="h-11 border-b border-border px-4 text-[11px] font-semibold text-muted-foreground first:pl-6 last:pr-6"
                        key={heading}
                      >
                        {t(`pages.models.merchants.columns.${heading}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMerchants.map((merchant) => {
                    const isPending = pendingMerchantIds.has(merchant.id);

                    return (
                      <Fragment key={merchant.id}>
                        <TableRow className="group hover:bg-secondary/30">
                          <TableCell className="h-16 min-w-60 border-b border-border px-4 pl-6 transition-colors">
                            <MerchantIdentityTrigger
                              brand={brand}
                              expanded={expandedMerchantId === merchant.id}
                              merchant={merchant}
                              model={model}
                              onToggle={() =>
                                setExpandedMerchantId((current) =>
                                  current === merchant.id ? null : merchant.id,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="h-16 min-w-28 border-b border-border px-4 transition-colors">
                            <Badge className="h-6 px-2.5 text-[10px]" variant="secondary">
                              {t(`pages.models.merchants.billingModes.${merchant.billingMode}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="h-16 min-w-48 border-b border-border px-4 transition-colors">
                            <MerchantPricingSummary
                              currency={selectedDisplayCurrency}
                              merchant={merchant}
                            />
                          </TableCell>
                          <TableCell className="h-16 min-w-40 border-b border-border px-4 transition-colors">
                            <div className="flex items-center justify-center gap-2">
                              <SignalBars signals={merchantSignals(merchant.successRate)} />
                              <strong
                                className={cn(
                                  'font-mono text-xs',
                                  merchant.successRate >= 90 ? 'text-success' : 'text-warning',
                                )}
                              >
                                {merchant.successRate.toFixed(
                                  merchant.successRate % 1 === 0 ? 0 : 2,
                                )}
                                %
                              </strong>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 min-w-24 border-b border-border px-4 font-mono text-xs text-muted-foreground transition-colors">
                            {(merchant.latencyMs / 1_000).toFixed(2)}s
                          </TableCell>
                          <TableCell className="h-16 min-w-36 border-b border-border px-4 transition-colors">
                            <div className="mx-auto flex max-w-36 flex-wrap justify-center gap-1.5">
                              <MerchantTags merchant={merchant} />
                            </div>
                          </TableCell>
                          <TableCell className="h-16 min-w-28 border-b border-border px-4 text-xs text-muted-foreground transition-colors">
                            {formatRelativeTime(merchant.healthUpdatedAt, i18n.language)}
                          </TableCell>
                          <TableCell className="h-16 min-w-60 border-b border-border px-4 pr-6 transition-colors">
                            <MerchantRouteActions
                              canConfigureRoute={canConfigureRoute}
                              isPending={isPending}
                              merchant={merchant}
                              onRouteChange={onRouteChange}
                            />
                          </TableCell>
                        </TableRow>
                        {expandedMerchantId === merchant.id && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              className="border-b border-border p-0"
                              colSpan={merchantHeadings.length}
                            >
                              <MerchantDetails
                                brand={brand}
                                currency={selectedDisplayCurrency}
                                merchant={merchant}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <MerchantTableState state={state} onRetry={onRetry} />
        )}

        {!canConfigureRoute && state === 'ready' && (
          <div className="flex items-center gap-2.5 border-t border-border bg-primary/5 px-5 py-3 text-xs text-primary">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10">
              <KeyRound aria-hidden="true" className="size-3.5" />
            </span>
            <p>{t('pages.models.merchants.tokenRequired')}</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border bg-secondary/35 px-5 py-3 text-xs text-muted-foreground">
          <span>{model.name}</span>
          <span className="font-mono">
            {t('pages.models.merchants.count', {
              count: state === 'ready' ? visibleMerchants.length : 0,
              visible: state === 'ready' ? visibleMerchants.length : 0,
              total: merchants.length,
            })}
          </span>
        </div>
      </Card>
    </section>
  );
}

function MerchantIdentityTrigger({
  brand,
  expanded,
  merchant,
  model,
  onToggle,
}: {
  brand: ModelBrand;
  expanded: boolean;
  merchant: MarketplaceMerchant;
  model: CatalogModel;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      aria-expanded={expanded}
      aria-label={t(`pages.models.merchants.details.${expanded ? 'collapse' : 'expand'}`, {
        id: merchant.channelId,
      })}
      className="h-auto w-full min-w-0 justify-start gap-2 rounded-lg p-0 text-left font-normal hover:bg-transparent"
      onClick={onToggle}
      type="button"
      variant="ghost"
    >
      <MerchantIdentity
        brand={brand}
        className="min-w-0 flex-1"
        merchant={merchant}
        model={model}
      />
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'size-4 shrink-0 text-muted-foreground transition-transform',
          expanded && 'rotate-180',
        )}
      />
    </Button>
  );
}

function MerchantIdentity({
  brand,
  className,
  merchant,
  model,
}: {
  brand: ModelBrand;
  className?: string;
  merchant: MarketplaceMerchant;
  model: CatalogModel;
}) {
  const { t } = useTranslation();
  const channelDescription = merchant.description.trim();
  return (
    <div className={cn('flex min-w-0 items-center justify-start gap-3 text-left', className)}>
      <BrandAvatar
        className="size-11 shrink-0 border-transparent bg-transparent"
        src={brand.avatarUrl}
        svg={brand.avatarSvg}
      />
      <span className="min-w-0">
        <strong className="block truncate text-[13px] font-semibold sm:text-sm">
          <span className="font-mono">{model.name}</span>
          <span>
            {' · '}
            {t('pages.models.merchants.merchantId', { id: merchant.channelId })}
          </span>
        </strong>
        <small
          className="mt-1 block max-w-full truncate text-[10px] text-muted-foreground"
          title={channelDescription || undefined}
        >
          {channelDescription || t('pages.models.merchants.channelDescriptionEmpty')}
        </small>
      </span>
    </div>
  );
}

function MerchantDetails({
  brand,
  className,
  currency,
  merchant,
}: {
  brand: ModelBrand;
  className?: string;
  currency: MarketplaceDisplayCurrency;
  merchant: MarketplaceMerchant;
}) {
  const { i18n, t } = useTranslation();
  const channelDescription = merchant.description.trim();
  const successRate = `${merchant.successRate.toFixed(merchant.successRate % 1 === 0 ? 0 : 1)}%`;
  const latency = `${(merchant.latencyMs / 1_000).toFixed(2)}s`;

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-secondary/20 p-3 text-left sm:p-4',
        className,
      )}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <small className="text-[10px] font-semibold text-muted-foreground">
            {t('pages.models.merchants.details.channelDescription')}
          </small>
          <p className="mt-2 text-xs leading-5 text-foreground">
            {channelDescription || t('pages.models.merchants.channelDescriptionEmpty')}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <small className="text-[10px] font-semibold text-muted-foreground">
            {t('pages.models.merchants.details.smartTags')}
          </small>
          <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
            <MerchantTags merchant={merchant} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <MerchantDetailFact
            label={t('pages.models.merchants.details.dataSource')}
            value={t('pages.models.merchants.details.liveData')}
          />
          <MerchantDetailFact
            label={t('pages.models.merchants.details.channel')}
            value={`${merchant.name} · ${t('pages.models.merchants.merchantId', { id: merchant.channelId })}`}
          />
          <MerchantDetailFact
            label={t('pages.models.merchants.details.provider')}
            value={brand.name}
          />
          <MerchantDetailFact
            label={t('pages.models.merchants.details.billing')}
            value={t(`pages.models.merchants.billingModes.${merchant.billingMode}`)}
          />
          <MerchantDetailFact
            label={t('pages.models.merchants.details.health')}
            value={`${successRate} · ${latency}`}
          />
          <MerchantDetailFact
            label={t('pages.models.merchants.details.statusUpdated')}
            value={formatRelativeTime(merchant.healthUpdatedAt, i18n.language)}
          />
        </div>

        <MerchantPricingDetails currency={currency} pricing={merchant.pricing} />
      </div>
    </section>
  );
}

function MerchantDetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
      <small className="block text-[9px] text-muted-foreground">{label}</small>
      <strong className="mt-1 block truncate text-xs font-semibold text-foreground">{value}</strong>
    </div>
  );
}

function MerchantPricingDetails({
  currency,
  pricing,
}: {
  currency: MarketplaceDisplayCurrency;
  pricing: MarketplaceMerchant['pricing'];
}) {
  const { t } = useTranslation();
  const groups = marketplacePricingGroupComparisons(pricing.official, pricing.merchant);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground">
        {t('pages.models.merchants.details.priceComparison')}
      </div>
      {groups.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">—</p>
      ) : (
        <div className="grid gap-3 p-3 xl:grid-cols-2">
          {groups.map(({ group, merchantRates, officialRates, rates }) => {
            const perRequest = rates.includes('request');
            return (
              <section
                className="overflow-hidden rounded-lg border border-border bg-muted/20"
                key={group.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <strong className="text-xs">{marketplacePriceGroupTitle(group, t)}</strong>
                  <Badge variant="secondary">
                    {t(
                      `pages.models.merchants.details.pricing.${perRequest ? 'perRequest' : 'perMillion'}`,
                      { currency: currency.code },
                    )}
                  </Badge>
                </div>
                <div className="overflow-x-auto bg-background">
                  <div
                    className="grid items-center gap-x-3 gap-y-2 px-3 py-3 text-xs"
                    style={{
                      gridTemplateColumns: `minmax(64px,0.7fr) repeat(${rates.length},minmax(88px,1fr))`,
                      minWidth: `${96 + rates.length * 104}px`,
                    }}
                  >
                    <span />
                    {rates.map((rate) => (
                      <small className="text-center text-[9px] text-muted-foreground" key={rate}>
                        {t(`pages.models.merchants.details.pricing.rates.${rate}`, {
                          defaultValue: rate,
                        })}
                      </small>
                    ))}
                    <strong className="text-[10px] text-muted-foreground">
                      {t('pages.models.merchants.details.officialPrice')}
                    </strong>
                    {rates.map((rate) => (
                      <MarketplaceDetailPrice
                        currency={currency}
                        key={rate}
                        value={officialRates[rate]}
                      />
                    ))}
                    <strong className="text-[10px] text-muted-foreground">
                      {t('pages.models.merchants.details.merchantPrice')}
                    </strong>
                    {rates.map((rate) => (
                      <MarketplaceDetailPrice
                        currency={currency}
                        key={rate}
                        value={merchantRates[rate]}
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function marketplacePricingGroupComparisons(
  officialPricing: MarketplacePricing,
  merchantPricing: MarketplacePricing,
) {
  const officialGroups = new Map(
    modelPricingGroups(officialPricing).map((group) => [group.id, group] as const),
  );
  const merchantGroups = new Map(
    modelPricingGroups(merchantPricing).map((group) => [group.id, group] as const),
  );
  const groupIds = new Set([...officialGroups.keys(), ...merchantGroups.keys()]);

  return [...groupIds].flatMap((id) => {
    const officialGroup = officialGroups.get(id);
    const merchantGroup = merchantGroups.get(id);
    const group = officialGroup ?? merchantGroup;
    if (!group) return [];
    const officialRates = officialGroup?.rates ?? {};
    const merchantRates = merchantGroup?.rates ?? {};
    const rates = orderedRateNames({ ...officialRates, ...merchantRates }).filter(
      (rate) => typeof officialRates[rate] === 'number' || typeof merchantRates[rate] === 'number',
    );
    return rates.length === 0 ? [] : [{ group, merchantRates, officialRates, rates }];
  });
}

function marketplacePriceGroupTitle(groupView: PriceGroupView, t: TFunction): string {
  const translationPath = 'pages.models.merchants.details';
  const group = groupView.group;
  if (group.type === 'experimentalMode' && group.mode === 'fast') {
    return groupView.maximumInclusive === undefined
      ? t(`${translationPath}.pricing.groups.fastMode`)
      : t(`${translationPath}.pricing.groups.fastModeUntil`, {
          maximum: formatTokenThreshold(groupView.maximumInclusive),
        });
  }
  if (group.type === 'experimentalModeTier' && group.mode === 'fast') {
    return groupView.maximumInclusive === undefined
      ? t(`${translationPath}.pricing.groups.fastModeTier`, {
          minimum: formatTokenThreshold(group.size),
        })
      : t(`${translationPath}.pricing.groups.fastModeRange`, {
          maximum: formatTokenThreshold(groupView.maximumInclusive),
          minimum: formatTokenThreshold(group.size),
        });
  }
  return priceGroupTitle(groupView, t, translationPath);
}

function formatTokenThreshold(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function MarketplaceDetailPrice({
  currency,
  value,
}: {
  currency: MarketplaceDisplayCurrency;
  value?: number;
}) {
  return (
    <strong className="text-center font-mono text-[11px]">
      {value !== undefined && Number.isFinite(value)
        ? formatMarketplacePrice(value, currency)
        : '—'}
    </strong>
  );
}

function MobilePrice({
  currency,
  label,
  price,
}: {
  currency: MarketplaceDisplayCurrency;
  label: string;
  price: number;
}) {
  return (
    <span className="block rounded-lg border border-border bg-secondary/45 px-2 py-2 text-center">
      <small className="block text-[9px] text-muted-foreground">{label}</small>
      <strong className="mt-1 block font-mono text-[11px]">
        {formatMarketplacePrice(price, currency)}
      </strong>
    </span>
  );
}

function MerchantTags({ merchant }: { merchant: MarketplaceMerchant }) {
  const { t } = useTranslation();
  const tags = merchantTags(merchant);
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  return tags.map((tag) => (
    <Badge className={cn('h-5 px-2 text-[9px]', tagClasses[tag])} key={tag}>
      {t(`pages.models.merchants.tags.${tag}`)}
    </Badge>
  ));
}

function MerchantRouteActions({
  canConfigureRoute,
  compact = false,
  isPending,
  merchant,
  onRouteChange,
}: {
  canConfigureRoute: boolean;
  compact?: boolean;
  isPending: boolean;
  merchant: MarketplaceMerchant;
  onRouteChange: MerchantTableProps['onRouteChange'];
}) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex justify-center gap-2', compact ? 'mt-4' : 'min-w-56')}>
      <Toggle
        className={cn('h-10 rounded-lg px-4 text-xs', compact ? 'min-w-0 flex-1' : 'min-w-26')}
        disabled={!canConfigureRoute || isPending}
        onPressedChange={(pressed) =>
          void onRouteChange(merchant.id, {
            isInRoute: pressed || merchant.isInRoute,
            isPinned: pressed,
          })
        }
        pressed={merchant.isPinned}
        variant="outline"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <Pin aria-hidden="true" className="size-3.5" />
        )}
        {t(merchant.isPinned ? 'pages.models.merchants.pinned' : 'pages.models.merchants.pin')}
      </Toggle>
      <Toggle
        className={cn(
          'h-10 rounded-lg border-primary bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[state=on]:border-input data-[state=on]:bg-background data-[state=on]:text-foreground',
          compact ? 'min-w-0 flex-1' : 'min-w-26',
        )}
        disabled={!canConfigureRoute || isPending}
        onPressedChange={(pressed) =>
          void onRouteChange(merchant.id, {
            isInRoute: pressed,
            isPinned: pressed && merchant.isPinned,
          })
        }
        pressed={merchant.isInRoute}
        variant="outline"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <Route aria-hidden="true" className="size-3.5" />
        )}
        {t(
          merchant.isInRoute ? 'pages.models.merchants.inRoute' : 'pages.models.merchants.addRoute',
        )}
      </Toggle>
    </div>
  );
}

function MerchantPricingSummary({
  currency,
  merchant,
}: {
  currency: MarketplaceDisplayCurrency;
  merchant: MarketplaceMerchant;
}) {
  const { t } = useTranslation();
  if (merchant.billingMode === 'token') {
    return (
      <div className="grid gap-1.5 font-mono text-xs font-semibold">
        <span>
          {t('pages.models.merchants.priceSummary.input', {
            price: formatMarketplacePrice(merchant.inputPrice, currency),
          })}
        </span>
        <span>
          {t('pages.models.merchants.priceSummary.output', {
            price: formatMarketplacePrice(merchant.outputPrice, currency),
          })}
        </span>
      </div>
    );
  }
  return (
    <strong className="font-mono text-xs">
      {formatMarketplacePrice(merchant.requestPrice, currency)}
    </strong>
  );
}

function MerchantTableState({
  state,
  onRetry,
}: {
  state: MerchantTableProps['state'];
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  if (state === 'loading') {
    return (
      <div className="grid min-h-44 place-items-center px-5 py-10 text-center">
        <div>
          <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">
            {t('pages.models.merchants.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="grid min-h-44 place-items-center px-5 py-10 text-center">
        <div>
          <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
          <p className="mt-3 text-xs text-muted-foreground">
            {t('pages.models.merchants.loadError')}
          </p>
          <Button className="mt-4" onClick={onRetry} size="sm" variant="outline">
            <RefreshCw aria-hidden="true" />
            {t('pages.models.states.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-5 py-12 text-center text-xs text-muted-foreground">
      {t('pages.models.merchants.empty')}
    </div>
  );
}
