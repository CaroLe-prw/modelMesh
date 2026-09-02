import { apiClient } from '@/lib/api-client';
import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type ModelStatus = 'disabled' | 'published';
export type ModelBillingMode = 'request' | 'token';
export type ModelSortDirection = 'asc' | 'desc';

export interface ModelItem {
  billingMode: ModelBillingMode;
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
  sortOrder: number;
  status: ModelStatus;
  updatedAt: string;
}

export interface ModelDraft {
  billingMode: ModelBillingMode;
  brandId: string;
  cacheReadPrice?: number;
  cacheWritePrice?: number;
  contextWindow?: number;
  identifier: string;
  inputPrice?: number;
  name?: string;
  outputPrice?: number;
  priceOverrides?: ModelPriceOverride[];
  sortOrder: number;
  status: ModelStatus;
}

export interface ModelPricingUpdateDraft {
  billingMode: ModelBillingMode;
  priceOverrides: ModelPriceOverride[];
  sortOrder: number;
}

export interface BatchModelDraft {
  billingMode: ModelBillingMode;
  brandId: string;
  modelIds: string[];
  priceOverrides: ModelPriceOverride[];
  sortOrder: number;
  status: ModelStatus;
}

export interface ListModelsQuery extends PaginationQuery {
  brandId?: string;
  query?: string;
  status?: ModelStatus;
  sortDirection: ModelSortDirection;
}

export type ModelPriceGroup =
  | { type: 'base' }
  | { type: 'contextOver200k' }
  | { size: number; tierType: string; type: 'tier' }
  | { mode: string; type: 'experimentalMode' }
  | {
      mode: string;
      size: number;
      tierType: string;
      type: 'experimentalModeTier';
    }
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
      sortDirection: filters.sortDirection,
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
