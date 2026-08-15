import { useState } from 'react';
import { catalogModels, tokenOptions, type BrandId } from '../data/marketplace';
import { CatalogSelectionPanel } from './catalog-selection-panel';
import { MerchantTable } from './merchant-table';

const DEFAULT_BRAND_ID: BrandId = 'openai';
const DEFAULT_MODEL_ID = 'gpt-5.6-sol';
const DEFAULT_TOKEN_ID = 'production';

export function MarketplaceExplorer() {
  const [selectedBrandId, setSelectedBrandId] = useState<BrandId>(DEFAULT_BRAND_ID);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [selectedTokenId, setSelectedTokenId] = useState(DEFAULT_TOKEN_ID);

  const selectedModel = catalogModels.find((model) => model.id === selectedModelId);
  const selectedToken = tokenOptions.find((token) => token.id === selectedTokenId);

  function handleBrandChange(brandId: BrandId) {
    const firstModel = catalogModels.find((model) => model.brandId === brandId);

    setSelectedBrandId(brandId);
    if (firstModel) {
      setSelectedModelId(firstModel.id);
    }
  }

  if (!selectedModel || !selectedToken) {
    return null;
  }

  return (
    <section className="relative z-10 pb-20 pt-10 sm:pt-12">
      <div className="page-shell mx-auto space-y-8">
        <CatalogSelectionPanel
          selectedBrandId={selectedBrandId}
          selectedModelId={selectedModelId}
          selectedTokenId={selectedTokenId}
          onBrandChange={handleBrandChange}
          onModelChange={setSelectedModelId}
          onTokenChange={setSelectedTokenId}
        />
        <MerchantTable model={selectedModel} />
      </div>
    </section>
  );
}
