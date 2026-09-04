export type AdminMerchantResourceView = 'channels' | 'modelLogs' | 'models';

export function adminMerchantResourceUrl(
  merchantId: number,
  resource: AdminMerchantResourceView,
): string {
  const search = new URLSearchParams({
    merchantId: String(merchantId),
    resource,
  });
  return `/admin/merchants?${search.toString()}`;
}
