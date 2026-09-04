import type { MerchantSettlementAccount } from '@/features/account/api/merchant-profile';
import { apiClient } from '@/lib/api-client';

export type MerchantWithdrawalStatus = 'paid' | 'processing' | 'rejected';

export interface MerchantWithdrawal {
  accountMasked: string;
  amountUsd: string;
  createdAt: string;
  currency: MerchantSettlementAccount['currency'];
  entityName: string;
  feeUsd: string;
  id: string;
  method: MerchantSettlementAccount['method'];
  netAmountUsd: string;
  network: MerchantSettlementAccount['network'];
  reviewNote: string;
  settlementAccountId: string | null;
  status: MerchantWithdrawalStatus;
  updatedAt: string;
}

export interface MerchantWithdrawalBundle {
  availableBalanceUsd: string;
  minimumWithdrawalUsd: string;
  paidAmountUsd: string;
  processingAmountUsd: string;
  settlementAccounts: MerchantSettlementAccount[];
  withdrawalFeePercent: string;
  withdrawals: MerchantWithdrawal[];
}

export interface CreateMerchantWithdrawalDraft {
  amountUsd: string;
  settlementAccountId: string;
}

export function getMerchantWithdrawals(signal?: AbortSignal): Promise<MerchantWithdrawalBundle> {
  return apiClient.get<MerchantWithdrawalBundle>('/merchant/withdrawals', { signal });
}

export function createMerchantWithdrawal(
  draft: CreateMerchantWithdrawalDraft,
): Promise<MerchantWithdrawalBundle> {
  return apiClient.post<MerchantWithdrawalBundle, CreateMerchantWithdrawalDraft>(
    '/merchant/withdrawals',
    draft,
  );
}
