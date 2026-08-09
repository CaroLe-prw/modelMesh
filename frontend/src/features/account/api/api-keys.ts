import type {
  ApiKeyDraft,
  ApiKeyItem,
  ApiKeyStatus,
} from '@/features/account/components/api-keys/api-key-types';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export interface ListApiKeysQuery extends PaginationQuery {
  query?: string;
  status?: ApiKeyStatus;
}

export interface CreatedApiKey {
  apiKey: ApiKeyItem;
  plainTextKey: string;
}

type UpdateApiKeyRequest = Omit<ApiKeyDraft, 'customKey'>;

export function listApiKeys(
  query: ListApiKeysQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ApiKeyItem>> {
  return apiClient.get<PaginatedResponse<ApiKeyItem>>('/api-keys', {
    query: {
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      status: query.status,
    },
    signal,
  });
}

export function createApiKey(draft: ApiKeyDraft): Promise<CreatedApiKey> {
  return apiClient.post<CreatedApiKey, ApiKeyDraft>('/api-keys', draft);
}

export function updateApiKey(id: string, draft: ApiKeyDraft): Promise<ApiKeyItem> {
  const { customKey: _customKey, ...request } = draft;

  return apiClient.put<ApiKeyItem, UpdateApiKeyRequest>(
    `/api-keys/${encodeURIComponent(id)}`,
    request,
  );
}

export function updateApiKeyStatus(id: string, status: ApiKeyStatus): Promise<ApiKeyItem> {
  return apiClient.put<ApiKeyItem, { status: ApiKeyStatus }>(
    `/api-keys/${encodeURIComponent(id)}/status`,
    { status },
  );
}

export function deleteApiKey(id: string): Promise<void> {
  return apiClient.delete<void>(`/api-keys/${encodeURIComponent(id)}`);
}
