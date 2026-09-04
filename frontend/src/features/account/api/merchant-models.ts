import { apiClient } from '@/lib/api-client';
import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { ModelBillingMode, ModelPriceOverride } from '@/features/account/api/models';
import type { PriceCurrency, PriceSetting } from '@/features/account/api/price-settings';

export type MerchantModelStatus = 'offline' | 'published';
export type MerchantModelReviewStatus = 'approved' | 'pending' | 'rejected';
export type MerchantModelRuntimeStatus = 'offline' | 'published';
export type MerchantPriceConversionMode = 'fixedRate' | 'parity';
export type MerchantBillingMode = 'request' | 'token';
export interface MerchantModel {
  billingMode: MerchantBillingMode;
  channelId: string;
  channelName: string;
  channelStatus: 'active' | 'offline' | 'pending' | 'rejected';
  contextWindow: number;
  createdAt: string;
  hasApprovedPrice: boolean;
  id: string;
  inputPrice: number;
  modelId: number;
  modelIdentifier: string;
  modelName: string;
  outputPrice: number;
  pendingPrice: MerchantModelPendingPrice | null;
  priceCurrency: PriceCurrency;
  pricing?: ModelPricing;
  providerId: string;
  reviewNote: string;
  reviewStatus: MerchantModelReviewStatus;
  status: MerchantModelStatus;
  updatedAt: string;
}

export interface MerchantModelPendingPrice {
  billingMode: MerchantBillingMode;
  effectiveAt: string | null;
  inputPrice: number;
  outputPrice: number;
  priceCurrency: PriceCurrency;
  pricing: ModelPricing;
}

export interface MerchantModelOption {
  contextWindow: number;
  defaultBillingMode: ModelBillingMode;
  id: number;
  identifier: string;
  inputPrice: number;
  name: string;
  outputPrice: number;
  pricing?: ModelPricing;
}

export interface MerchantModelOptions {
  models: MerchantModelOption[];
  priceSettings: PriceSetting[];
}

export interface MerchantModelDraft {
  billingMode: MerchantBillingMode;
  channelId: string;
  conversionMode: MerchantPriceConversionMode;
  exchangeRate: number;
  inputPrice: number;
  modelId: number;
  outputPrice: number;
  priceCurrency: PriceCurrency;
  priceOverrides: ModelPriceOverride[];
}

interface MerchantModelOptionsCacheEntry {
  expiresAt: number;
  promise: Promise<MerchantModelOptions>;
  value?: MerchantModelOptions;
}

const MODEL_OPTIONS_CACHE_TTL_MS = 60_000;
const merchantModelOptionsCache = new Map<string, MerchantModelOptionsCacheEntry>();

export function listMerchantModels(signal?: AbortSignal): Promise<MerchantModel[]> {
  return apiClient.get<MerchantModel[]>('/merchant/models', { signal });
}

export function listMerchantModelOptions(channelId: string): Promise<MerchantModelOptions> {
  const cached = merchantModelOptionsCache.get(channelId);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  if (cached) merchantModelOptionsCache.delete(channelId);

  const entry: MerchantModelOptionsCacheEntry = {
    expiresAt: Date.now() + MODEL_OPTIONS_CACHE_TTL_MS,
    promise: apiClient.get<MerchantModelOptions>('/merchant/model-options', {
      query: { channelId },
    }),
  };
  merchantModelOptionsCache.set(channelId, entry);
  void entry.promise
    .then((value) => {
      if (merchantModelOptionsCache.get(channelId) === entry) entry.value = value;
    })
    .catch(() => {
      if (merchantModelOptionsCache.get(channelId) === entry) {
        merchantModelOptionsCache.delete(channelId);
      }
    });
  return entry.promise;
}

export function readMerchantModelOptionsCache(channelId: string): MerchantModelOptions | undefined {
  const cached = merchantModelOptionsCache.get(channelId);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    merchantModelOptionsCache.delete(channelId);
    return undefined;
  }
  return cached.value;
}

export function refreshMerchantModelOptions(channelId: string): Promise<MerchantModelOptions> {
  merchantModelOptionsCache.delete(channelId);
  return listMerchantModelOptions(channelId);
}

export function preloadMerchantModelOptions(channelIds: string[]): void {
  const uniqueChannelIds = [...new Set(channelIds)];
  void Promise.allSettled(uniqueChannelIds.map((channelId) => listMerchantModelOptions(channelId)));
}

export function clearMerchantModelOptionsCache(): void {
  merchantModelOptionsCache.clear();
}

export function createMerchantModel(draft: MerchantModelDraft): Promise<MerchantModel> {
  return apiClient.post<MerchantModel, MerchantModelDraft>('/merchant/models', draft);
}

export function updateMerchantModel(id: string, draft: MerchantModelDraft): Promise<MerchantModel> {
  return apiClient.put<MerchantModel, MerchantModelDraft>(
    `/merchant/models/${encodeURIComponent(id)}`,
    draft,
  );
}

export function updateMerchantModelStatus(
  id: string,
  status: MerchantModelRuntimeStatus,
): Promise<MerchantModel> {
  return apiClient.put<MerchantModel, { status: MerchantModelRuntimeStatus }>(
    `/merchant/models/${encodeURIComponent(id)}/status`,
    { status },
  );
}

export function deleteMerchantModel(id: string): Promise<void> {
  return apiClient.delete<void>(`/merchant/models/${encodeURIComponent(id)}`);
}
