import type { Signal } from '@/components/common/signal-bars';

export type BrandId = string;
export type MerchantTag = 'stable' | 'lowCost' | 'fast' | 'quality';
export type ModelBillingMode = 'request' | 'token';
export type MerchantBillingMode = 'request' | 'token';
export type MerchantBillingModeFilter = 'all' | MerchantBillingMode;
export type MerchantSortMode = 'recent' | 'input' | 'output' | 'latency' | 'success';

export interface MarketplaceDisplayCurrency {
  code: string;
  exchangeRate: string;
}

export interface ModelBrand {
  avatarSvg?: string;
  avatarUrl?: string;
  id: BrandId;
  merchantCount: number;
  name: string;
}

export interface CatalogModel {
  billingMode: ModelBillingMode;
  brandId: BrandId;
  id: number;
  identifier: string;
  inputFrom: number;
  merchantCount: number;
  name: string;
  outputFrom: number;
  requestFrom: number;
}

export interface TokenOption {
  id: string;
  maskedKey: string;
  name: string;
  status: 'active' | 'idle';
}

export interface MarketplaceMerchant {
  billingMode: MerchantBillingMode;
  channelId: number;
  description: string;
  healthUpdatedAt: string;
  id: string;
  inputPrice: number;
  isInRoute: boolean;
  isPinned: boolean;
  latencyMs: number;
  name: string;
  outputPrice: number;
  pricing: MarketplacePricingComparison;
  requestPrice: number;
  priceMultiplier: number | null;
  successRate: number;
}

export interface MarketplacePricingComparison {
  official: MarketplacePriceRow;
  merchant: MarketplacePriceRow;
}

export interface MarketplacePriceRow {
  cacheRead: string | null;
  cacheWrite: string | null;
  input: string | null;
  output: string | null;
  request: string | null;
}

export function formatUsd(value: number) {
  return `$${value < 0.01 ? value.toFixed(6) : value.toFixed(4)}`;
}

export function formatMarketplacePrice(
  valueInUsd: number,
  currency: MarketplaceDisplayCurrency,
): string {
  const exchangeRate = Number(currency.exchangeRate);
  const value = valueInUsd * (Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1);
  const formattedValue = value < 0.01 ? value.toFixed(6) : value.toFixed(4);
  return `${marketplaceCurrencySymbol(currency.code)}${formattedValue}`;
}

function marketplaceCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    AUD: 'A$',
    CAD: 'C$',
    CNY: '¥',
    EUR: '€',
    GBP: '£',
    HKD: 'HK$',
    JPY: '¥',
    KRW: '₩',
    SGD: 'S$',
    USD: '$',
    USDT: 'USDT ',
  };
  return symbols[code] ?? `${code} `;
}

export function merchantTags(merchant: MarketplaceMerchant): MerchantTag[] {
  const tags: MerchantTag[] = [];

  if (merchant.successRate >= 95) tags.push('stable');
  if (merchant.priceMultiplier !== null && merchant.priceMultiplier <= 1) tags.push('lowCost');
  if (merchant.latencyMs > 0 && merchant.latencyMs <= 3_000) tags.push('fast');
  if (merchant.successRate >= 99) tags.push('quality');

  return tags;
}

export function merchantComparablePrice(merchant: MarketplaceMerchant): number {
  if (merchant.billingMode === 'token') return merchant.inputPrice;
  return merchant.requestPrice;
}

export function merchantMatchesId(merchant: MarketplaceMerchant, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  return (
    !normalizedQuery ||
    String(merchant.channelId).includes(normalizedQuery) ||
    merchant.id.toLowerCase().includes(normalizedQuery)
  );
}

export function merchantMatchesBillingMode(
  merchant: MarketplaceMerchant,
  billingMode: MerchantBillingModeFilter,
): boolean {
  return billingMode === 'all' || merchant.billingMode === billingMode;
}

export function sortMarketplaceMerchants(
  merchants: MarketplaceMerchant[],
  sortMode: MerchantSortMode,
): MarketplaceMerchant[] {
  return merchants.toSorted((first, second) => {
    if (sortMode === 'recent') {
      return compareOptionalNumbersDescending(
        timestampOrNull(first.healthUpdatedAt),
        timestampOrNull(second.healthUpdatedAt),
      );
    }
    if (sortMode === 'input') {
      return compareOptionalNumbers(
        tokenPriceOrNull(first, 'input'),
        tokenPriceOrNull(second, 'input'),
      );
    }
    if (sortMode === 'output') {
      return compareOptionalNumbers(
        tokenPriceOrNull(first, 'output'),
        tokenPriceOrNull(second, 'output'),
      );
    }
    if (sortMode === 'latency') {
      return compareOptionalNumbers(
        first.latencyMs > 0 ? first.latencyMs : null,
        second.latencyMs > 0 ? second.latencyMs : null,
      );
    }
    return second.successRate - first.successRate;
  });
}

function compareOptionalNumbers(first: number | null, second: number | null): number {
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return first - second;
}

function compareOptionalNumbersDescending(first: number | null, second: number | null): number {
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return second - first;
}

function timestampOrNull(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function tokenPriceOrNull(merchant: MarketplaceMerchant, kind: 'input' | 'output'): number | null {
  if (merchant.billingMode !== 'token') return null;
  return kind === 'input' ? merchant.inputPrice : merchant.outputPrice;
}

export function merchantSignals(successRate: number): Signal[] {
  const normalizedRate = Math.max(0, Math.min(100, successRate));
  const goodCount = Math.round((normalizedRate / 100) * 8);
  const remaining = 8 - goodCount;
  const warningCount = normalizedRate >= 75 ? remaining : Math.ceil(remaining / 2);

  return [
    ...Array.from({ length: goodCount }, () => 'good' as const),
    ...Array.from({ length: warningCount }, () => 'warn' as const),
    ...Array.from({ length: remaining - warningCount }, () => 'bad' as const),
  ];
}

export function formatRelativeTime(value: string, language: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';

  const elapsedSeconds = Math.max(0, Math.round((now - timestamp) / 1_000));
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (elapsedSeconds < 60) return formatter.format(-elapsedSeconds, 'second');
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return formatter.format(-elapsedMinutes, 'minute');
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return formatter.format(-elapsedHours, 'hour');
  return formatter.format(-Math.round(elapsedHours / 24), 'day');
}
