import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type MerchantRequestStatus =
  'approved' | 'cancelled' | 'changesRequested' | 'completed' | 'pending';
export type MerchantRequestType =
  'channelAccess' | 'channelOperation' | 'modelOperation' | 'modelReview' | 'quotaAdjustment';
export type MerchantRequestOrigin =
  'channelLifecycle' | 'channelReview' | 'manual' | 'modelLifecycle' | 'modelReview';
export type MerchantRequestAction =
  'activate' | 'delete' | 'offline' | 'priceChange' | 'publish' | 'unpublish' | 'violation';
export type MerchantRequestSortOrder = 'asc' | 'desc';
export type MerchantRequestSortField = 'submittedAt' | 'updatedAt';
export type MerchantOperationSource = 'admin' | 'merchant' | 'system';

export interface MerchantRequest {
  action: MerchantRequestAction | null;
  description: string;
  id: string;
  origin: MerchantRequestOrigin;
  operationReason: string;
  operatorSource: MerchantOperationSource;
  operatorUserId: number | null;
  resourceId: string;
  requestType: MerchantRequestType;
  reviewNote: string;
  status: MerchantRequestStatus;
  subject: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ListMerchantRequestsQuery extends PaginationQuery {
  query?: string;
  sortBy: MerchantRequestSortField;
  sortOrder: MerchantRequestSortOrder;
  status?: MerchantRequestStatus;
}

export function listMerchantRequests(
  query: ListMerchantRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<MerchantRequest>> {
  return apiClient.get<PaginatedResponse<MerchantRequest>>('/merchant/requests', {
    query: {
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
    },
    signal,
  });
}

export function listLatestMerchantChannelOperations(
  signal?: AbortSignal,
): Promise<MerchantRequest[]> {
  return apiClient.get<MerchantRequest[]>('/merchant/channel-operations/latest', { signal });
}
