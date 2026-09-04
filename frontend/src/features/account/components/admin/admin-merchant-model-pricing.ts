import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { MerchantBillingMode, MerchantModel } from '@/features/account/api/merchant-models';
import type { PriceCurrency } from '@/features/account/api/price-settings';

export interface MerchantModelPricingView {
  billingMode: MerchantBillingMode;
  effectiveAt: string | null;
  inputPrice: number;
  kind: 'current' | 'pending';
  outputPrice: number;
  priceCurrency: PriceCurrency;
  pricing?: ModelPricing;
}

export function merchantModelPricingViews(model: MerchantModel): MerchantModelPricingView[] {
  const views: MerchantModelPricingView[] = [
    {
      billingMode: model.billingMode,
      effectiveAt: null,
      inputPrice: model.inputPrice,
      kind: 'current',
      outputPrice: model.outputPrice,
      priceCurrency: model.priceCurrency,
      pricing: model.pricing,
    },
  ];
  if (model.pendingPrice) {
    views.push({
      billingMode: model.pendingPrice.billingMode,
      effectiveAt: model.pendingPrice.effectiveAt,
      inputPrice: model.pendingPrice.inputPrice,
      kind: 'pending',
      outputPrice: model.pendingPrice.outputPrice,
      priceCurrency: model.pendingPrice.priceCurrency,
      pricing: model.pendingPrice.pricing,
    });
  }
  return views;
}
