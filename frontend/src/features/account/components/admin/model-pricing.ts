import type { ModelCatalogEntry } from '@/features/account/api/model-catalog';
import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { ModelPriceGroup } from '@/features/account/api/models';
import type { PriceCurrency } from '@/features/account/api/price-settings';

export interface CustomPriceTierForm {
  id: number;
  threshold: string;
}

export interface PriceGroupView {
  customTierId?: number;
  group: ModelPriceGroup;
  id: string;
  maximumInclusive?: number;
  rates: Record<string, number | undefined>;
  thresholdValue?: string;
}

export function modelPriceGroups(
  entry?: ModelCatalogEntry,
  customPriceTiers: CustomPriceTierForm[] = [],
): PriceGroupView[] {
  return modelPricingGroups(entry?.pricing, customPriceTiers);
}

export function modelPricingGroups(
  pricing?: ModelCatalogEntry['pricing'],
  customPriceTiers: CustomPriceTierForm[] = [],
): PriceGroupView[] {
  const groups: PriceGroupView[] = [];
  const base = pricing?.base;
  const catalogTiers: PriceGroupView[] = (pricing?.tiers ?? []).map((tier) => ({
    group: { size: tier.size, tierType: tier.tierType, type: 'tier' },
    id: `tier-${tier.tierType}-${tier.size}`,
    rates: tier.rates,
  }));
  const customTiers: PriceGroupView[] = customPriceTiers.map((tier) => ({
    customTierId: tier.id,
    group: {
      size: validContextThreshold(tier.threshold) ?? 0,
      tierType: 'context',
      type: 'tier',
    },
    id: `custom-tier-${tier.id}`,
    rates: { cache_read: undefined, cache_write: undefined, input: undefined, output: undefined },
    thresholdValue: tier.threshold,
  }));
  const tiers = [...catalogTiers, ...customTiers].sort((left, right) => {
    const leftGroup = left.group;
    const rightGroup = right.group;
    if (leftGroup.type !== 'tier' || rightGroup.type !== 'tier') return 0;
    if (leftGroup.size === 0) return 1;
    if (rightGroup.size === 0) return -1;
    return leftGroup.size === rightGroup.size
      ? leftGroup.tierType.localeCompare(rightGroup.tierType)
      : leftGroup.size - rightGroup.size;
  });
  const firstContextTier = tiers.find(
    (tier) =>
      tier.group.type === 'tier' && tier.group.tierType === 'context' && tier.group.size > 0,
  );
  groups.push({
    group: { type: 'base' },
    id: 'base',
    maximumInclusive:
      firstContextTier?.group.type === 'tier' ? firstContextTier.group.size : undefined,
    rates:
      base && Object.keys(base).length > 0
        ? base
        : { cache_read: undefined, cache_write: undefined, input: undefined, output: undefined },
  });
  if (pricing?.contextOver200k && catalogTiers.length === 0) {
    groups.push({
      group: { type: 'contextOver200k' },
      id: 'context-over-200k',
      rates: pricing.contextOver200k,
    });
  }
  for (const [index, tier] of tiers.entries()) {
    if (tier.group.type !== 'tier') continue;
    const tierGroup = tier.group;
    const nextTier = tiers
      .slice(index + 1)
      .find(
        (candidate) =>
          candidate.group.type === 'tier' &&
          candidate.group.tierType === tierGroup.tierType &&
          candidate.group.size > tierGroup.size,
      );
    groups.push({
      ...tier,
      maximumInclusive: nextTier?.group.type === 'tier' ? nextTier.group.size : undefined,
      rates: tier.rates,
    });
  }
  const experimentalModeNames = new Set([
    ...Object.keys(pricing?.experimentalModes ?? {}),
    ...Object.keys(pricing?.experimentalModeTiers ?? {}),
  ]);
  for (const mode of experimentalModeNames) {
    const rates = pricing?.experimentalModes?.[mode] ?? {};
    const modeTiers = [...(pricing?.experimentalModeTiers?.[mode] ?? [])].sort((left, right) =>
      left.size === right.size
        ? left.tierType.localeCompare(right.tierType)
        : left.size - right.size,
    );
    const firstModeContextTier = modeTiers.find(
      (tier) => tier.tierType === 'context' && tier.size > 0,
    );
    groups.push({
      group: { mode, type: 'experimentalMode' },
      id: `experimental-${mode}`,
      maximumInclusive: firstModeContextTier?.size,
      rates,
    });
    for (const [index, tier] of modeTiers.entries()) {
      const nextTier = modeTiers
        .slice(index + 1)
        .find((candidate) => candidate.tierType === tier.tierType && candidate.size > tier.size);
      groups.push({
        group: {
          mode,
          size: tier.size,
          tierType: tier.tierType,
          type: 'experimentalModeTier',
        },
        id: `experimental-${mode}-tier-${tier.tierType}-${tier.size}`,
        maximumInclusive: nextTier?.size,
        rates: tier.rates,
      });
    }
  }
  for (const [tier, rates] of Object.entries(pricing?.serviceTiers ?? {})) {
    groups.push({
      group: { tier, type: 'serviceTier' },
      id: `service-${tier}`,
      rates,
    });
  }
  return groups;
}

export function priceInputKey(group: PriceGroupView, rate: string): string {
  return `${group.id}:${rate}`;
}

export function priceFieldId(fieldId: string, key: string): string {
  return `${fieldId}-price-${encodeURIComponent(key)}`;
}

export function optionalPrice(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

export function validContextThreshold(value: string): number | undefined {
  const threshold = Number(value);
  return Number.isSafeInteger(threshold) && threshold > 0 ? threshold : undefined;
}

export function customTierThresholdId(fieldId: string, customTierId: number): string {
  return `${fieldId}-custom-tier-${customTierId}-threshold`;
}

export function scaleModelPricing(pricing: ModelPricing, multiplier: number): ModelPricing {
  const scaleRates = (rates: Record<string, number> | undefined) =>
    rates
      ? Object.fromEntries(
          Object.entries(rates).map(([name, value]) => [name, scalePrice(value, multiplier)]),
        )
      : undefined;
  const scaleTiers = (tiers: ModelPricing['tiers']) =>
    tiers?.map((tier) => ({ ...tier, rates: scaleRates(tier.rates) ?? {} }));
  const scaleNamedRates = (groups: Record<string, Record<string, number>> | undefined) =>
    groups
      ? Object.fromEntries(
          Object.entries(groups).map(([name, rates]) => [name, scaleRates(rates) ?? {}]),
        )
      : undefined;
  const scaleNamedTiers = (
    groups: Record<string, NonNullable<ModelPricing['tiers']>> | undefined,
  ) =>
    groups
      ? Object.fromEntries(
          Object.entries(groups).map(([name, tiers]) => [name, scaleTiers(tiers) ?? []]),
        )
      : undefined;

  return {
    base: scaleRates(pricing.base) ?? {},
    contextOver200k: scaleRates(pricing.contextOver200k),
    experimentalModes: scaleNamedRates(pricing.experimentalModes),
    experimentalModeTiers: scaleNamedTiers(pricing.experimentalModeTiers),
    serviceTiers: scaleNamedRates(pricing.serviceTiers),
    tiers: scaleTiers(pricing.tiers),
  };
}

export function scalePrice(value: number, multiplier: number): number {
  return Number((value * multiplier).toFixed(8));
}

export function priceCurrencySymbol(currency: PriceCurrency): string {
  switch (currency) {
    case 'USD':
      return '$';
    case 'CNY':
    case 'JPY':
      return '¥';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'HKD':
      return 'HK$';
    case 'SGD':
      return 'S$';
    case 'AUD':
      return 'A$';
    case 'CAD':
      return 'C$';
    case 'KRW':
      return '₩';
    case 'USDT':
      return '₮';
  }
}
