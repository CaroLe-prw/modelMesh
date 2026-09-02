import { AlertCircle, Boxes, LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listApiKeys } from '@/features/account/api/api-keys';
import {
  getMarketplaceCatalog,
  getMarketplaceMerchants,
  updateMarketplaceRoute,
  type MarketplaceCatalog,
  type MarketplaceRouteState,
} from '@/features/models/api/marketplace';
import type {
  MarketplaceDisplayCurrency,
  MarketplaceMerchant,
  MerchantBillingModeFilter,
  MerchantSortMode,
  TokenOption,
} from '@/features/models/data/marketplace';
import { CatalogSelectionPanel } from './catalog-selection-panel';
import { MerchantTable } from './merchant-table';

type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { catalog: MarketplaceCatalog; tokens: TokenOption[]; status: 'ready' };

type MerchantState =
  | { status: 'loading' }
  | { status: 'error' }
  | { merchants: MarketplaceMerchant[]; status: 'ready' };

export function MarketplaceExplorer() {
  const { i18n, t } = useTranslation();
  const preferredDisplayCurrencyCode = i18n.resolvedLanguage?.startsWith('zh') ? 'CNY' : 'USD';
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: 'loading' });
  const [merchantState, setMerchantState] = useState<MerchantState>({ status: 'loading' });
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(0);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [merchantIdQuery, setMerchantIdQuery] = useState('');
  const [billingModeFilter, setBillingModeFilter] = useState<MerchantBillingModeFilter>('all');
  const [merchantSortMode, setMerchantSortMode] = useState<MerchantSortMode>('recent');
  const [selectedDisplayCurrencyCode, setSelectedDisplayCurrencyCode] = useState(
    preferredDisplayCurrencyCode,
  );
  const [catalogReload, setCatalogReload] = useState(0);
  const [merchantReload, setMerchantReload] = useState(0);
  const [pendingMerchantIds, setPendingMerchantIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const controller = new AbortController();
    setCatalogState({ status: 'loading' });

    void Promise.all([
      getMarketplaceCatalog(controller.signal),
      listApiKeys({ page: 1, pageSize: 100 }, controller.signal),
    ])
      .then(([catalog, apiKeys]) => {
        const tokens = apiKeys.items.map<TokenOption>((apiKey) => ({
          id: apiKey.id,
          maskedKey: apiKey.maskedKey,
          name: apiKey.name,
          status: apiKey.status === 'active' ? 'active' : 'idle',
        }));
        const firstBrandId = catalog.brands[0]?.id ?? '';
        const firstModelId =
          catalog.models.find((model) => model.brandId === firstBrandId)?.id ?? 0;
        const firstTokenId =
          tokens.find((token) => token.status === 'active')?.id ?? tokens[0]?.id ?? '';

        setSelectedBrandId(firstBrandId);
        setSelectedModelId(firstModelId);
        setSelectedTokenId(firstTokenId);
        setSelectedDisplayCurrencyCode((current) =>
          resolveDisplayCurrencyCode(
            catalog.displayCurrencies,
            current,
            preferredDisplayCurrencyCode,
          ),
        );
        setCatalogState({ catalog, tokens, status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) setCatalogState({ status: 'error' });
      });

    return () => controller.abort();
  }, [catalogReload, preferredDisplayCurrencyCode]);

  useEffect(() => {
    if (selectedModelId <= 0) return;

    const controller = new AbortController();
    setMerchantState({ status: 'loading' });
    void getMarketplaceMerchants(selectedModelId, selectedTokenId || undefined, controller.signal)
      .then((merchants) => setMerchantState({ merchants, status: 'ready' }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setMerchantState({ status: 'error' });
      });

    return () => controller.abort();
  }, [merchantReload, selectedModelId, selectedTokenId]);

  const selectedModel = useMemo(
    () =>
      catalogState.status === 'ready'
        ? catalogState.catalog.models.find((model) => model.id === selectedModelId)
        : undefined,
    [catalogState, selectedModelId],
  );
  const selectedBrand = useMemo(
    () =>
      catalogState.status === 'ready' && selectedModel
        ? catalogState.catalog.brands.find((brand) => brand.id === selectedModel.brandId)
        : undefined,
    [catalogState, selectedModel],
  );
  const selectedDisplayCurrency = useMemo(
    () =>
      catalogState.status === 'ready'
        ? catalogState.catalog.displayCurrencies.find(
            (currency) => currency.code === selectedDisplayCurrencyCode,
          )
        : undefined,
    [catalogState, selectedDisplayCurrencyCode],
  );

  const handleBrandChange = useCallback(
    (brandId: string) => {
      if (catalogState.status !== 'ready') return;
      const firstModel = catalogState.catalog.models.find((model) => model.brandId === brandId);

      setSelectedBrandId(brandId);
      setMerchantIdQuery('');
      if (firstModel) setSelectedModelId(firstModel.id);
    },
    [catalogState],
  );

  const handleReset = useCallback(() => {
    if (catalogState.status !== 'ready') return;
    const brandId = catalogState.catalog.brands[0]?.id ?? '';
    const modelId = catalogState.catalog.models.find((model) => model.brandId === brandId)?.id ?? 0;
    const tokenId =
      catalogState.tokens.find((token) => token.status === 'active')?.id ??
      catalogState.tokens[0]?.id ??
      '';

    setSelectedBrandId(brandId);
    setSelectedModelId(modelId);
    setSelectedTokenId(tokenId);
    setMerchantIdQuery('');
    setBillingModeFilter('all');
    setMerchantSortMode('recent');
    setSelectedDisplayCurrencyCode(
      resolveDisplayCurrencyCode(
        catalogState.catalog.displayCurrencies,
        preferredDisplayCurrencyCode,
        'USD',
      ),
    );
  }, [catalogState, preferredDisplayCurrencyCode]);

  const handleRouteChange = useCallback(
    async (merchantId: string, nextState: MarketplaceRouteState) => {
      if (!selectedTokenId || selectedModelId <= 0) return;
      setPendingMerchantIds((current) => new Set(current).add(merchantId));

      try {
        const route = await updateMarketplaceRoute(
          selectedTokenId,
          selectedModelId,
          merchantId,
          nextState,
        );
        setMerchantState((current) =>
          current.status === 'ready'
            ? {
                merchants: current.merchants.map((merchant) => ({
                  ...merchant,
                  isPinned: route.isPinned
                    ? merchant.id === merchantId
                    : merchant.id === merchantId
                      ? false
                      : merchant.isPinned,
                  isInRoute: merchant.id === merchantId ? route.isInRoute : merchant.isInRoute,
                })),
                status: 'ready',
              }
            : current,
        );
        toast.success(t('pages.models.merchants.feedback.saved'));
      } catch {
        toast.error(t('pages.models.merchants.feedback.saveFailed'));
      } finally {
        setPendingMerchantIds((current) => {
          const next = new Set(current);
          next.delete(merchantId);
          return next;
        });
      }
    },
    [selectedModelId, selectedTokenId, t],
  );

  if (catalogState.status === 'loading') {
    return <CatalogStatus icon={LoaderCircle} label={t('pages.models.states.loading')} spin />;
  }

  if (catalogState.status === 'error') {
    return (
      <CatalogStatus
        action={
          <Button onClick={() => setCatalogReload((version) => version + 1)} variant="outline">
            <RefreshCw aria-hidden="true" />
            {t('pages.models.states.retry')}
          </Button>
        }
        icon={AlertCircle}
        label={t('pages.models.states.loadError')}
      />
    );
  }

  if (!selectedBrand || !selectedModel || !selectedBrandId || !selectedDisplayCurrency) {
    return <CatalogStatus icon={Boxes} label={t('pages.models.states.empty')} />;
  }

  return (
    <section className="relative z-10 pb-20 pt-10 sm:pt-12">
      <div className="page-shell mx-auto space-y-8">
        <CatalogSelectionPanel
          billingModeFilter={billingModeFilter}
          brands={catalogState.catalog.brands}
          displayCurrencies={catalogState.catalog.displayCurrencies}
          merchantIdQuery={merchantIdQuery}
          merchantSortMode={merchantSortMode}
          models={catalogState.catalog.models}
          tokenOptions={catalogState.tokens}
          selectedBrandId={selectedBrandId}
          selectedDisplayCurrency={selectedDisplayCurrency}
          selectedModelId={selectedModelId}
          selectedTokenId={selectedTokenId}
          onBrandChange={handleBrandChange}
          onBillingModeFilterChange={setBillingModeFilter}
          onMerchantIdQueryChange={setMerchantIdQuery}
          onMerchantSortModeChange={setMerchantSortMode}
          onModelChange={(modelId) => {
            setSelectedModelId(modelId);
            setMerchantIdQuery('');
          }}
          onSelectedDisplayCurrencyChange={setSelectedDisplayCurrencyCode}
          onRefresh={() => setCatalogReload((version) => version + 1)}
          onReset={handleReset}
          onTokenChange={setSelectedTokenId}
        />
        <MerchantTable
          billingModeFilter={billingModeFilter}
          brand={selectedBrand}
          canConfigureRoute={Boolean(selectedTokenId)}
          merchants={merchantState.status === 'ready' ? merchantState.merchants : []}
          merchantIdQuery={merchantIdQuery}
          merchantSortMode={merchantSortMode}
          model={selectedModel}
          pendingMerchantIds={pendingMerchantIds}
          selectedDisplayCurrency={selectedDisplayCurrency}
          state={merchantState.status}
          onRetry={() => setMerchantReload((version) => version + 1)}
          onRouteChange={handleRouteChange}
        />
      </div>
    </section>
  );
}

function resolveDisplayCurrencyCode(
  currencies: MarketplaceDisplayCurrency[],
  preferredCode: string,
  fallbackCode = 'USD',
): string {
  if (currencies.some((currency) => currency.code === preferredCode)) return preferredCode;
  if (currencies.some((currency) => currency.code === fallbackCode)) return fallbackCode;
  return currencies[0]?.code ?? fallbackCode;
}

function CatalogStatus({
  action,
  icon: Icon,
  label,
  spin = false,
}: {
  action?: ReactNode;
  icon: typeof LoaderCircle;
  label: string;
  spin?: boolean;
}) {
  return (
    <section className="relative z-10 grid min-h-[calc(100vh-188px)] place-items-center px-4 py-14">
      <Card className="w-full max-w-sm items-center gap-0 px-7 py-12 text-center">
        <Icon
          aria-hidden="true"
          className={spin ? 'size-6 animate-spin text-primary' : 'size-6 text-muted-foreground'}
        />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        {action && <div className="mt-5">{action}</div>}
      </Card>
    </section>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
