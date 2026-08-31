import type {
  MerchantSettlementCurrency,
  MerchantSettlementMethod,
} from '@/features/account/api/merchant-profile';

export function fixedSettlementCurrency(
  method: MerchantSettlementMethod,
): MerchantSettlementCurrency | null {
  if (method === 'alipay') return 'CNY';
  if (method === 'usdt') return 'USDT';
  return null;
}
