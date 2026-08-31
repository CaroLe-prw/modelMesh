import { apiClient } from '@/lib/api-client';

export type MerchantSettlementCurrency = 'CNY' | 'USD' | 'USDT';
export type MerchantSettlementMethod = 'alipay' | 'bank' | 'usdt';
export type MerchantSettlementNetwork = 'BEP20' | 'ERC20' | 'POLYGON' | 'TRC20';

export interface MerchantSettlementAccount {
  accountMasked: string;
  createdAt: string;
  currency: MerchantSettlementCurrency;
  entityName: string;
  id: string;
  isDefault: boolean;
  method: MerchantSettlementMethod;
  network: MerchantSettlementNetwork | null;
}

export interface MerchantProfile {
  businessName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  industry: string;
  merchantCode: string;
  settlementAccounts: MerchantSettlementAccount[];
  updatedAt: string;
  website: string;
}

export interface MerchantProfileDraft {
  businessName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  industry: string;
  website: string;
}

export interface MerchantSettlementAccountDraft {
  account: string;
  currency: MerchantSettlementCurrency;
  entityName: string;
  method: MerchantSettlementMethod;
  network?: MerchantSettlementNetwork;
}

export function getMerchantProfile(signal?: AbortSignal): Promise<MerchantProfile> {
  return apiClient.get<MerchantProfile>('/merchant/profile', { signal });
}

export function updateMerchantProfile(draft: MerchantProfileDraft): Promise<MerchantProfile> {
  return apiClient.put<MerchantProfile, MerchantProfileDraft>('/merchant/profile', draft);
}

export function createMerchantSettlementAccount(
  draft: MerchantSettlementAccountDraft,
): Promise<MerchantProfile> {
  return apiClient.post<MerchantProfile, MerchantSettlementAccountDraft>(
    '/merchant/settlement-accounts',
    draft,
  );
}

export function setDefaultMerchantSettlementAccount(id: string): Promise<MerchantProfile> {
  return apiClient.put<MerchantProfile, Record<string, never>>(
    `/merchant/settlement-accounts/${encodeURIComponent(id)}/default`,
    {},
  );
}

export function deleteMerchantSettlementAccount(id: string): Promise<MerchantProfile> {
  return apiClient.delete<MerchantProfile>(
    `/merchant/settlement-accounts/${encodeURIComponent(id)}`,
  );
}
