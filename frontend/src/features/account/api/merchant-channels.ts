import { apiClient } from '@/lib/api-client';

export type MerchantChannelStatus = 'active' | 'offline' | 'pending' | 'rejected';
export type MerchantChannelControlStatus = 'active' | 'offline';

export interface MerchantChannel {
  apiKeyConfigured: boolean;
  availableModels: string[];
  baseUrl: string;
  channelId: number;
  createdAt: string;
  description: string;
  id: string;
  latencyMs: number;
  modelCount: number;
  name: string;
  provider: string;
  providerId: string;
  reviewNote: string;
  status: MerchantChannelStatus;
  successRate: number;
  supportedModels: string[];
  updatedAt: string;
}

export interface MerchantChannelDraft {
  apiKey?: string;
  availableModels: string[];
  baseUrl: string;
  description: string;
  name: string;
  providerId: string;
  status: MerchantChannelControlStatus;
  supportedModels: string[];
}

export interface MerchantChannelCreateDraft extends Omit<
  MerchantChannelDraft,
  'apiKey' | 'status'
> {
  apiKey: string;
}

export interface DiscoverMerchantChannelModelsDraft {
  apiKey?: string;
  baseUrl: string;
  channelId?: string;
  providerId: string;
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

export function createMerchantChannel(draft: MerchantChannelCreateDraft): Promise<MerchantChannel> {
  return apiClient.post<MerchantChannel, MerchantChannelCreateDraft>('/merchant/channels', draft);
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

export function updateMerchantChannelStatus(
  id: string,
  status: MerchantChannelControlStatus,
): Promise<MerchantChannel> {
  return apiClient.put<MerchantChannel, { status: MerchantChannelControlStatus }>(
    `/merchant/channels/${encodeURIComponent(id)}/status`,
    { status },
  );
}

export async function discoverMerchantChannelModels(
  draft: DiscoverMerchantChannelModelsDraft,
): Promise<string[]> {
  const response = await apiClient.post<{ models: string[] }, DiscoverMerchantChannelModelsDraft>(
    '/merchant/channels/discover-models',
    draft,
  );
  return response.models;
}

export function deleteMerchantChannel(id: string): Promise<void> {
  return apiClient.delete<void>(`/merchant/channels/${encodeURIComponent(id)}`);
}
