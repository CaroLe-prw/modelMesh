import { apiClient } from '@/lib/api-client';

export const priceCurrencies = [
  'USD',
  'CNY',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'SGD',
  'AUD',
  'CAD',
  'KRW',
  'USDT',
] as const;

export type PriceCurrency = (typeof priceCurrencies)[number];

export interface PriceSetting {
  exchangeRate: number;
  priceCurrency: PriceCurrency;
  updatedAt: string;
}

export interface PriceSettings {
  rates: PriceSetting[];
  reviewPolicy: PriceReviewPolicy;
}

export interface PriceReviewPolicy {
  approvedPriceEffectiveDelayHours: number;
  priceIncreaseReviewThresholdPercent: number;
  updatedAt: string;
}

export interface PriceSettingDraft {
  exchangeRate: number;
  priceCurrency: PriceCurrency;
}

export interface PriceSettingsDraft {
  rates: PriceSettingDraft[];
  reviewPolicy: PriceReviewPolicyDraft;
}

export interface PriceReviewPolicyDraft {
  approvedPriceEffectiveDelayHours: number;
  priceIncreaseReviewThresholdPercent: number;
}

export function getPriceSettings(signal?: AbortSignal): Promise<PriceSettings> {
  return apiClient.get<PriceSettings>('/admin/price-settings', { signal });
}

export function updatePriceSettings(draft: PriceSettingsDraft): Promise<PriceSettings> {
  return apiClient.put<PriceSettings, PriceSettingsDraft>('/admin/price-settings', draft);
}
