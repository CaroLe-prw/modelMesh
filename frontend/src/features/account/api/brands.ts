import { apiClient } from '@/lib/api-client';

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

export interface ListBrandsQuery {
  query?: string;
  status?: BrandStatus;
}

export function listBrands(query: ListBrandsQuery, signal?: AbortSignal): Promise<BrandItem[]> {
  return apiClient.get<BrandItem[]>('/admin/brands', {
    query: {
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
