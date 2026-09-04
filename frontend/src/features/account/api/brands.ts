import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type BrandStatus = 'active' | 'hidden';

export interface BrandItem {
  avatarSvg?: string;
  avatarUrl?: string;
  id: string;
  merchantCount: number;
  modelCount: number;
  name: string;
  sortOrder: number;
  status: BrandStatus;
  updatedAt: string;
}

export interface BrandDraft {
  avatarUrl?: string;
  id: string;
  name: string;
  presetId?: string;
  sortOrder: number;
  status: BrandStatus;
}

export interface BrandUpdateDraft {
  name: string;
  sortOrder: number;
}

export interface ListBrandsQuery extends PaginationQuery {
  query?: string;
  status?: BrandStatus;
}

export function listBrands(
  query: ListBrandsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<BrandItem>> {
  return apiClient.get<PaginatedResponse<BrandItem>>('/admin/brands', {
    query: {
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      status: query.status,
    },
    signal,
  });
}

export function createBrand(draft: BrandDraft): Promise<BrandItem> {
  return apiClient.post<BrandItem, BrandDraft>('/admin/brands', draft);
}

export function updateBrand(id: string, draft: BrandUpdateDraft): Promise<BrandItem> {
  return apiClient.put<BrandItem, BrandUpdateDraft>(
    `/admin/brands/${encodeURIComponent(id)}`,
    draft,
  );
}

export function updateBrandStatus(id: string, status: BrandStatus): Promise<BrandItem> {
  return apiClient.put<BrandItem, { status: BrandStatus }>(
    `/admin/brands/${encodeURIComponent(id)}/status`,
    { status },
  );
}

export function deleteBrand(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/brands/${encodeURIComponent(id)}`);
}
