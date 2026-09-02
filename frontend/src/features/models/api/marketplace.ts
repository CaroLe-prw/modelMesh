import type {
  CatalogModel,
  MarketplaceDisplayCurrency,
  MarketplaceMerchant,
  ModelBrand,
} from '@/features/models/data/marketplace';
import { apiClient } from '@/lib/api-client';

export interface MarketplaceCatalog {
  brands: ModelBrand[];
  displayCurrencies: MarketplaceDisplayCurrency[];
  models: CatalogModel[];
}

export interface MarketplaceRouteState {
  isInRoute: boolean;
  isPinned: boolean;
}

export function getMarketplaceCatalog(signal?: AbortSignal): Promise<MarketplaceCatalog> {
  return apiClient.get<MarketplaceCatalog>('/marketplace/catalog', { signal });
}

export function getMarketplaceMerchants(
  modelId: number,
  apiKeyId?: string,
  signal?: AbortSignal,
): Promise<MarketplaceMerchant[]> {
  return apiClient.get<MarketplaceMerchant[]>(
    `/marketplace/models/${encodeURIComponent(modelId)}/merchants`,
    {
      query: { apiKeyId },
      signal,
    },
  );
}

export function updateMarketplaceRoute(
  apiKeyId: string,
  modelId: number,
  merchantId: string,
  state: MarketplaceRouteState,
): Promise<MarketplaceRouteState> {
  return apiClient.put<MarketplaceRouteState, MarketplaceRouteState>(
    `/marketplace/api-keys/${encodeURIComponent(apiKeyId)}/models/${encodeURIComponent(modelId)}/merchants/${encodeURIComponent(merchantId)}`,
    state,
  );
}
