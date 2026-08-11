import type { ModelCatalogEntry } from '@/features/account/api/model-catalog';
import type { ModelPriceGroup } from '@/features/account/api/models';

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
  const groups: PriceGroupView[] = [];
  const pricing = entry?.pricing;
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
  for (const [mode, rates] of Object.entries(pricing?.experimentalModes ?? {})) {
    groups.push({
      group: { mode, type: 'experimentalMode' },
      id: `experimental-${mode}`,
      rates,
    });
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
