import { apiClient } from '@/lib/api-client';
import type {
  MerchantChannel,
  MerchantChannelControlStatus,
} from '@/features/account/api/merchant-channels';
import type {
  MerchantModel,
  MerchantModelRuntimeStatus,
} from '@/features/account/api/merchant-models';
import type {
  ListMerchantRequestsQuery,
  MerchantRequest,
} from '@/features/account/api/merchant-requests';
import type { PaginatedResponse } from '@/lib/pagination';

export function listAdminMerchantChannels(
  merchantId: number,
  signal?: AbortSignal,
): Promise<MerchantChannel[]> {
  return apiClient.get<MerchantChannel[]>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/channels`,
    { signal },
  );
}

export function getAdminMerchantChannelLatestOperation(
  merchantId: number,
  channelId: string,
  signal?: AbortSignal,
): Promise<MerchantRequest | null> {
  return apiClient.get<MerchantRequest | null>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/channels/${encodeURIComponent(channelId)}/latest-operation`,
    { signal },
  );
}

export function listAdminMerchantModels(
  merchantId: number,
  signal?: AbortSignal,
): Promise<MerchantModel[]> {
  return apiClient.get<MerchantModel[]>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/models`,
    { signal },
  );
}

export function getAdminMerchantModelLatestOperation(
  merchantId: number,
  listingId: string,
  signal?: AbortSignal,
): Promise<MerchantRequest | null> {
  return apiClient.get<MerchantRequest | null>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/models/${encodeURIComponent(listingId)}/latest-operation`,
    { signal },
  );
}

export function updateAdminMerchantChannelStatus(
  merchantId: number,
  channelId: string,
  status: MerchantChannelControlStatus,
  reason: string,
): Promise<MerchantChannel> {
  return apiClient.put<MerchantChannel, { reason: string; status: MerchantChannelControlStatus }>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/channels/${encodeURIComponent(channelId)}/status`,
    { reason, status },
  );
}

export function updateAdminMerchantModelStatus(
  merchantId: number,
  listingId: string,
  status: MerchantModelRuntimeStatus,
  reason: string,
): Promise<MerchantModel> {
  return apiClient.put<MerchantModel, { reason: string; status: MerchantModelRuntimeStatus }>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/models/${encodeURIComponent(listingId)}/status`,
    { reason, status },
  );
}

export function listAdminMerchantModelLogs(
  merchantId: number,
  query: ListMerchantRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<MerchantRequest>> {
  return apiClient.get<PaginatedResponse<MerchantRequest>>(
    `/admin/merchants/${encodeURIComponent(merchantId)}/model-logs`,
    {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        query: query.query,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: query.status,
      },
      signal,
    },
  );
}
