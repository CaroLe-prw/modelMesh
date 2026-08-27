import { apiClient } from '@/lib/api-client';

export type MerchantChannelStatus = 'active' | 'degraded' | 'offline';
export type MerchantChannelControlStatus = 'active' | 'offline';

export interface MerchantChannel {
  createdAt: string;
  id: string;
  latencyMs: number;
  modelCount: number;
  name: string;
  provider: string;
  providerId: string;
  status: MerchantChannelStatus;
  successRate: number;
  updatedAt: string;
}

export interface MerchantChannelDraft {
  name: string;
  providerId: string;
  status: MerchantChannelControlStatus;
}

export interface MerchantChannelProvider {
  id: string;
  name: string;
}

export function listMerchantChannelProviders(
  signal?: AbortSignal,
): Promise<MerchantChannelProvider[]> {
  return apiClient.get<MerchantChannelProvider[]>('/merchant/channel-providers', { signal });
}

export function listMerchantChannels(signal?: AbortSignal): Promise<MerchantChannel[]> {
  return apiClient.get<MerchantChannel[]>('/merchant/channels', { signal });
}

export function createMerchantChannel(draft: MerchantChannelDraft): Promise<MerchantChannel> {
  return apiClient.post<MerchantChannel, MerchantChannelDraft>('/merchant/channels', draft);
}

export function updateMerchantChannel(
  id: string,
  draft: MerchantChannelDraft,
): Promise<MerchantChannel> {
  return apiClient.put<MerchantChannel, MerchantChannelDraft>(
    `/merchant/channels/${encodeURIComponent(id)}`,
    draft,
  );
}

export function deleteMerchantChannel(id: string): Promise<void> {
  return apiClient.delete<void>(`/merchant/channels/${encodeURIComponent(id)}`);
}
