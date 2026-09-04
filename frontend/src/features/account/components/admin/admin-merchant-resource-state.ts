import type { MerchantModel } from '@/features/account/api/merchant-models';

export function isMerchantModelRoutable(
  model: Pick<MerchantModel, 'channelStatus' | 'hasApprovedPrice' | 'reviewStatus' | 'status'>,
): boolean {
  return (
    model.status === 'published' &&
    model.reviewStatus === 'approved' &&
    model.hasApprovedPrice &&
    model.channelStatus === 'active'
  );
}
