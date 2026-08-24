import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type AdminMerchantStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface AdminMerchant {
  balanceMicrousd: number;
  channelCount: number | null;
  concurrencyLimit: number;
  createdAt: string;
  email: string;
  id: number;
  modelCount: number | null;
  name: string;
  rpmLimit: number;
  status: AdminMerchantStatus;
  application: AdminMerchantApplication | null;
}

export interface AdminMerchantApplication {
  applicationCode: string;
  avatarUrl: string | null;
  website: string | null;
  description: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ListAdminMerchantsQuery extends PaginationQuery {
  query?: string;
  status?: AdminMerchantStatus;
}

export interface AdminMerchantUpdate {
  concurrencyLimit: number;
  email: string;
  name: string;
  rpmLimit: number;
}

type AdminMerchantPayload = Omit<AdminMerchant, 'concurrencyLimit' | 'rpmLimit'> & {
  concurrencyLimit?: number | null;
  rpmLimit?: number | null;
};

export type AdminMerchantAccessStatus = 'active' | 'disabled';

export interface AdminMerchantStatusUpdate {
  status: AdminMerchantAccessStatus;
}

export interface BatchUpdateAdminMerchantStatusResponse {
  updatedCount: number;
}

export interface BatchDeleteAdminMerchantsResponse {
  deletedCount: number;
}

export type AdminMerchantReviewDecision = 'approved' | 'rejected';

export interface AdminMerchantReview {
  decision: AdminMerchantReviewDecision;
  reviewNote: string;
}

export async function listAdminMerchants(
  query: ListAdminMerchantsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AdminMerchant>> {
  const response = await apiClient.get<PaginatedResponse<AdminMerchantPayload>>(
    '/admin/merchants',
    {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        query: query.query,
        status: query.status,
      },
      signal,
    },
  );

  return {
    ...response,
    items: response.items.map((merchant) => ({
      ...merchant,
      concurrencyLimit: normalizeRequestLimit(merchant.concurrencyLimit),
      rpmLimit: normalizeRequestLimit(merchant.rpmLimit),
    })),
  };
}

function normalizeRequestLimit(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function updateAdminMerchant(id: number, update: AdminMerchantUpdate): Promise<void> {
  return apiClient.patch<void, AdminMerchantUpdate>(`/admin/merchants/${id}`, update);
}

export function updateAdminMerchantStatus(
  id: number,
  update: AdminMerchantStatusUpdate,
): Promise<void> {
  return apiClient.patch<void, AdminMerchantStatusUpdate>(`/admin/merchants/${id}/status`, update);
}

export function batchUpdateAdminMerchantStatus(
  userIds: number[],
  update: AdminMerchantStatusUpdate,
): Promise<BatchUpdateAdminMerchantStatusResponse> {
  return apiClient.patch<
    BatchUpdateAdminMerchantStatusResponse,
    AdminMerchantStatusUpdate & { userIds: number[] }
  >('/admin/merchants/batch-status', { userIds, ...update });
}

export function reviewAdminMerchant(id: number, review: AdminMerchantReview): Promise<void> {
  return apiClient.post<void, AdminMerchantReview>(`/admin/merchants/${id}/review`, review);
}

export function deleteAdminMerchant(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/merchants/${id}`);
}

export function batchDeleteAdminMerchants(
  userIds: number[],
): Promise<BatchDeleteAdminMerchantsResponse> {
  return apiClient.post<BatchDeleteAdminMerchantsResponse, { userIds: number[] }>(
    '/admin/merchants/batch-delete',
    { userIds },
  );
}
