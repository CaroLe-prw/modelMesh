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

export interface SystemFinanceSettings {
  withdrawalMinimumUsd: string;
  withdrawalFeePercent: string;
  platformFeePercent: string;
}

export interface SystemSettings {
  registrationEnabled: boolean;
  finance: SystemFinanceSettings;
  settlement: MerchantSettlementSettings;
  updatedAt: string;
}

export interface SystemSettingsDraft {
  registrationEnabled: boolean;
  finance: SystemFinanceSettings;
  settlement: Pick<MerchantSettlementSettings, 'enabledMethods' | 'enabledNetworks'>;
}

export function getAdminSystemSettings(signal?: AbortSignal): Promise<SystemSettings> {
  return apiClient.get<SystemSettings>('/admin/system-settings', { signal });
}

export function updateAdminSystemSettings(draft: SystemSettingsDraft): Promise<SystemSettings> {
  return apiClient.put<SystemSettings, SystemSettingsDraft>('/admin/system-settings', draft);
}

export function getMerchantSettlementSettings(
  signal?: AbortSignal,
): Promise<MerchantSettlementSettings> {
  return apiClient.get<MerchantSettlementSettings>('/merchant/settlement-settings', { signal });
}
