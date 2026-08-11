import { apiClient } from '@/lib/api-client';
import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type ModelStatus = 'disabled' | 'published';

export interface ModelItem {
  brandId: string;
  cacheReadPrice: number;
  cacheReadPriceOverridden: boolean;
  cacheWritePrice: number;
  cacheWritePriceOverridden: boolean;
  catalogSource?: 'models.dev';
  contextWindow: number;
  id: number;
  identifier: string;
  inputPrice: number;
  inputPriceOverridden: boolean;
  merchantCount: number;
  name: string;
  outputPrice: number;
  outputPriceOverridden: boolean;
  defaultPricing: ModelPricing;
  pricingOverrides: ModelPricing;
  pricing: ModelPricing;
  status: ModelStatus;
  updatedAt: string;
}

export interface ModelDraft {
  brandId: string;
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  contextWindow?: number;
  identifier: string;
  inputPrice?: number;
  name?: string;
  outputPrice?: number;
  priceOverrides?: ModelPriceOverride[];
  status: ModelStatus;
}

export interface ModelPricingUpdateDraft {
  priceOverrides: ModelPriceOverride[];
}

export interface BatchModelDraft {
  brandId: string;
  modelIds: string[];
  priceOverrides: ModelPriceOverride[];
  status: ModelStatus;
}

export interface ListModelsQuery extends PaginationQuery {
  brandId?: string;
  query?: string;
  status?: ModelStatus;
}

export type ModelPriceGroup =
  | { type: 'base' }
  | { type: 'contextOver200k' }
  | { size: number; tierType: string; type: 'tier' }
  | { mode: string; type: 'experimentalMode' }
  | { tier: string; type: 'serviceTier' };

export interface ModelPriceOverride {
  group: ModelPriceGroup;
  price: number;
  rate: string;
}

export function listModels(
  filters: ListModelsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ModelItem>> {
  return apiClient.get<PaginatedResponse<ModelItem>>('/admin/models', {
    query: {
      brandId: filters.brandId,
      page: filters.page,
      pageSize: filters.pageSize,
      query: filters.query,
      status: filters.status,
    },
    signal,
  });
}

export function createModel(draft: ModelDraft): Promise<ModelItem> {
  return apiClient.post<ModelItem, ModelDraft>('/admin/models', draft);
}

export function createModelsBatch(draft: BatchModelDraft): Promise<ModelItem[]> {
  return apiClient.post<ModelItem[], BatchModelDraft>('/admin/models/batch', draft);
}

export function updateModelStatus(id: number, status: ModelStatus): Promise<ModelItem> {
  return apiClient.put<ModelItem, { status: ModelStatus }>(`/admin/models/${id}/status`, {
    status,
  });
}

export function deleteModel(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/models/${id}`);
}

export function updateModelPricing(id: number, draft: ModelPricingUpdateDraft): Promise<ModelItem> {
  return apiClient.put<ModelItem, ModelPricingUpdateDraft>(`/admin/models/${id}`, draft);
}
