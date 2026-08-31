import { apiClient } from '@/lib/api-client';
import type { BrandItem } from '@/features/account/api/brands';

export type ModelPriceRates = Record<string, number>;

export interface ModelPriceTier {
  rates: ModelPriceRates;
  size: number;
  tierType: string;
}

export interface ModelPricing {
  base?: ModelPriceRates;
  contextOver200k?: ModelPriceRates;
  experimentalModes?: Record<string, ModelPriceRates>;
  experimentalModeTiers?: Record<string, ModelPriceTier[]>;
  serviceTiers?: Record<string, ModelPriceRates>;
  tiers?: ModelPriceTier[];
}

export interface ModelCatalogEntry {
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  contextWindow?: number;
  inputPrice?: number;
  modelId: string;
  name: string;
  outputPrice?: number;
  pricing: ModelPricing;
  providerId: string;
  source: 'models.dev';
  syncedAt: string;
}

export interface ModelCatalogOption {
  modelId: string;
  name: string;
}

export interface ModelCatalogOptionsResponse {
  brands: BrandItem[];
  modelsByBrand: Record<string, ModelCatalogOption[]>;
}

export function listModelCatalogOptions(
  signal?: AbortSignal,
): Promise<ModelCatalogOptionsResponse> {
  return apiClient.get<ModelCatalogOptionsResponse>('/admin/model-catalog/options', { signal });
}

export function lookupModelCatalog(
  brandId: string,
  modelId: string,
  signal?: AbortSignal,
): Promise<ModelCatalogEntry> {
  return apiClient.get<ModelCatalogEntry>('/admin/model-catalog/lookup', {
    query: { brandId, modelId },
    signal,
  });
}

export function listModelCatalog(
  brandId: string,
  signal?: AbortSignal,
): Promise<ModelCatalogEntry[]> {
  return apiClient.get<ModelCatalogEntry[]>('/admin/model-catalog', {
    query: { brandId },
    signal,
  });
}
