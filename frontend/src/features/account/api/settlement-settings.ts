import { apiClient } from '@/lib/api-client';
import type {
  MerchantSettlementMethod,
  MerchantSettlementNetwork,
} from '@/features/account/api/merchant-profile';

export const merchantSettlementMethods = ['bank', 'alipay', 'usdt'] as const;
export const merchantSettlementNetworks = ['TRC20', 'ERC20', 'BEP20', 'POLYGON'] as const;

export interface MerchantSettlementSettings {
  enabledMethods: MerchantSettlementMethod[];
  enabledNetworks: MerchantSettlementNetwork[];
  updatedAt: string;
}

export interface MerchantSettlementSettingsDraft {
  enabledMethods: MerchantSettlementMethod[];
  enabledNetworks: MerchantSettlementNetwork[];
}

export function getAdminMerchantSettlementSettings(
  signal?: AbortSignal,
): Promise<MerchantSettlementSettings> {
  return apiClient.get<MerchantSettlementSettings>('/admin/settlement-settings', { signal });
}

export function updateAdminMerchantSettlementSettings(
  draft: MerchantSettlementSettingsDraft,
): Promise<MerchantSettlementSettings> {
  return apiClient.put<MerchantSettlementSettings, MerchantSettlementSettingsDraft>(
    '/admin/settlement-settings',
    draft,
  );
}

export function getMerchantSettlementSettings(
  signal?: AbortSignal,
): Promise<MerchantSettlementSettings> {
  return apiClient.get<MerchantSettlementSettings>('/merchant/settlement-settings', { signal });
}
