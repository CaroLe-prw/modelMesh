import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandAvatar } from '@/components/common/brand-avatar';
import { RadioCardItem } from '@/components/common/radio-card-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  formatMarketplacePrice,
  type BrandId,
  type CatalogModel,
  type MarketplaceDisplayCurrency,
  type MerchantBillingModeFilter,
  type MerchantSortMode,
  type ModelBrand,
  type TokenOption,
} from '../data/marketplace';

interface CatalogSelectionPanelProps {
  billingModeFilter: MerchantBillingModeFilter;
  brands: ModelBrand[];
  displayCurrencies: MarketplaceDisplayCurrency[];
  merchantIdQuery: string;
  merchantSortMode: MerchantSortMode;
  models: CatalogModel[];
  tokenOptions: TokenOption[];
  selectedBrandId: BrandId;
  selectedDisplayCurrency: MarketplaceDisplayCurrency;
  selectedModelId: number;
  selectedTokenId: string;
  onBrandChange: (brandId: BrandId) => void;
  onBillingModeFilterChange: (billingMode: MerchantBillingModeFilter) => void;
  onMerchantIdQueryChange: (query: string) => void;
  onMerchantSortModeChange: (sortMode: MerchantSortMode) => void;
  onModelChange: (modelId: number) => void;
  onSelectedDisplayCurrencyChange: (currencyCode: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onTokenChange: (tokenId: string) => void;
}

export function CatalogSelectionPanel({
  billingModeFilter,
  brands,
  displayCurrencies,
  merchantIdQuery,
  merchantSortMode,
  models,
  tokenOptions,
  selectedBrandId,
  selectedDisplayCurrency,
  selectedModelId,
  selectedTokenId,
  onBrandChange,
  onBillingModeFilterChange,
  onMerchantIdQueryChange,
  onMerchantSortModeChange,
  onModelChange,
  onSelectedDisplayCurrencyChange,
  onRefresh,
  onReset,
  onTokenChange,
}: CatalogSelectionPanelProps) {
  const { t } = useTranslation();
  const visibleModels = models.filter((model) => model.brandId === selectedBrandId);
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId);
  const selectedModel = models.find((model) => model.id === selectedModelId);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-[0_20px_60px_color-mix(in_srgb,var(--color-text)_6%,transparent)]">
      <div className="grid gap-5 border-b border-border p-4 sm:p-5">
        <QuickSelectionRow
          hint={t('pages.models.explorer.quick.hint')}
          title={t('pages.models.explorer.brand.quickTitle')}
        >
          <RadioGroup
            className="flex w-max min-w-full gap-3"
            onValueChange={(value) => {
              const brand = brands.find((item) => item.id === value);
              if (brand) onBrandChange(brand.id);
            }}
            value={selectedBrandId}
          >
            {brands.map((brand) => {
              const isSelected = brand.id === selectedBrandId;

              return (
                <RadioCardItem
                  className="marketplace-selector-card relative min-h-18 justify-start rounded-xl px-4 text-left"
                  containerClassName="marketplace-selector-item min-w-52 max-w-72 flex-1"
                  id={`catalog-brand-${brand.id}`}
                  key={brand.id}
                  value={brand.id}
                >
                  <BrandAvatar
                    className={cn('size-10 shrink-0', isSelected && 'ring-2 ring-primary/15')}
                    src={brand.avatarUrl}
                    svg={brand.avatarSvg}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{brand.name}</strong>
                    <small className="mt-1 block text-[10px] text-muted-foreground">
                      {t('pages.models.explorer.brand.merchantCount', {
                        count: brand.merchantCount,
                      })}
                    </small>
                  </span>
                  {isSelected && (
                    <Badge className="absolute right-2 top-2 h-5 border-primary/20 bg-primary/10 px-2 text-[9px] text-primary">
                      {t('pages.models.explorer.selected')}
                    </Badge>
                  )}
                </RadioCardItem>
              );
            })}
          </RadioGroup>
        </QuickSelectionRow>

        <QuickSelectionRow
          hint={t('pages.models.explorer.quick.hint')}
          title={t('pages.models.explorer.model.quickTitle')}
        >
          <RadioGroup
            className="flex w-max min-w-full gap-3"
            onValueChange={(value) => onModelChange(Number(value))}
            value={String(selectedModelId)}
          >
            {visibleModels.map((model) => {
              const isSelected = model.id === selectedModelId;

              return (
                <RadioCardItem
                  className="marketplace-selector-card relative min-h-18 justify-start rounded-xl px-4 text-left"
                  containerClassName="marketplace-selector-item min-w-64 flex-1"
                  id={`catalog-model-${model.id}`}
                  key={model.id}
                  value={String(model.id)}
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate pr-7 font-mono text-sm">{model.name}</strong>
                    <small className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {model.billingMode === 'request'
                          ? t('pages.models.explorer.model.requestFrom', {
                              price: formatMarketplacePrice(
                                model.requestFrom,
                                selectedDisplayCurrency,
                              ),
                            })
                          : t('pages.models.explorer.model.inputFrom', {
                              price: formatMarketplacePrice(
                                model.inputFrom,
                                selectedDisplayCurrency,
                              ),
                            })}
                      </span>
                      <span>
                        {t('pages.models.explorer.model.merchantCount', {
                          count: model.merchantCount,
                        })}
                      </span>
                    </small>
                  </span>
                  {isSelected && (
                    <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check aria-hidden="true" className="size-3" />
                    </span>
                  )}
                </RadioCardItem>
              );
            })}
          </RadioGroup>
        </QuickSelectionRow>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(140px,0.9fr)_minmax(200px,1.5fr)_minmax(115px,0.9fr)_minmax(115px,0.9fr)_minmax(135px,1fr)_minmax(105px,0.8fr)_auto]">
        <div className="grid min-w-0 gap-1.5">
          <Label className="text-xs font-semibold" htmlFor="marketplace-token-select">
            {t('pages.models.explorer.token.title')}
          </Label>
          <Select
            disabled={tokenOptions.length === 0}
            onValueChange={onTokenChange}
            value={selectedTokenId || undefined}
          >
            <SelectTrigger
              className="!h-10 w-full bg-background [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:flex-1 [&>[data-slot=select-value]]:justify-start [&>[data-slot=select-value]]:text-left"
              id="marketplace-token-select"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              <SelectValue placeholder={t('pages.models.explorer.token.empty')} />
            </SelectTrigger>
            <SelectContent
              align="start"
              className="w-[var(--radix-select-trigger-width)]"
              position="popper"
            >
              {tokenOptions.map((token) => (
                <SelectItem key={token.id} value={token.id}>
                  {token.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <MarketplaceModelPicker
          brands={brands}
          models={models}
          onBrandChange={onBrandChange}
          onModelChange={onModelChange}
          selectedBrand={selectedBrand}
          selectedBrandId={selectedBrandId}
          selectedModel={selectedModel}
        />

        <div className="grid min-w-0 gap-1.5">
          <Label className="text-xs font-semibold" htmlFor="marketplace-merchant-id">
            {t('pages.models.explorer.merchantId.label')}
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-1 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-10 bg-background pl-9 font-mono text-xs"
              id="marketplace-merchant-id"
              inputMode="numeric"
              onChange={(event) => onMerchantIdQueryChange(event.target.value)}
              placeholder={t('pages.models.explorer.merchantId.placeholder')}
              value={merchantIdQuery}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label className="text-xs font-semibold" htmlFor="marketplace-billing-mode">
            {t('pages.models.explorer.billingMode.label')}
          </Label>
          <Select
            onValueChange={(value) => onBillingModeFilterChange(value as MerchantBillingModeFilter)}
            value={billingModeFilter}
          >
            <SelectTrigger className="!h-10 w-full bg-background" id="marketplace-billing-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {(['all', 'token', 'request'] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.models.explorer.billingMode.options.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label className="text-xs font-semibold" htmlFor="marketplace-merchant-sort">
            {t('pages.models.explorer.sort.label')}
          </Label>
          <Select
            onValueChange={(value) => onMerchantSortModeChange(value as MerchantSortMode)}
            value={merchantSortMode}
          >
            <SelectTrigger className="!h-10 w-full bg-background" id="marketplace-merchant-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {(['recent', 'input', 'output', 'latency', 'success'] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.models.explorer.sort.options.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label className="text-xs font-semibold" htmlFor="marketplace-display-currency">
            {t('pages.models.explorer.displayCurrency.label')}
          </Label>
          <Select
            onValueChange={onSelectedDisplayCurrencyChange}
            value={selectedDisplayCurrency.code}
          >
            <SelectTrigger className="!h-10 w-full bg-background" id="marketplace-display-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {displayCurrencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {t(`pages.models.explorer.displayCurrency.options.${currency.code}`, {
                    defaultValue: currency.code,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:col-span-2 md:justify-end xl:col-span-1">
          <Button className="h-10" onClick={onRefresh} type="button" variant="outline">
            <RefreshCw aria-hidden="true" />
            {t('pages.models.explorer.actions.refresh')}
          </Button>
          <Button className="h-10" onClick={onReset} type="button" variant="outline">
            <RotateCcw aria-hidden="true" />
            {t('pages.models.explorer.actions.reset')}
          </Button>
          <Button asChild className="col-span-2 h-10 sm:col-span-1">
            <Link to="/account/api-keys">
              <Plus aria-hidden="true" />
              {t('pages.models.explorer.token.create')}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MarketplaceModelPicker({
  brands,
  models,
  onBrandChange,
  onModelChange,
  selectedBrand,
  selectedBrandId,
  selectedModel,
}: {
  brands: ModelBrand[];
  models: CatalogModel[];
  onBrandChange: (brandId: BrandId) => void;
  onModelChange: (modelId: number) => void;
  selectedBrand?: ModelBrand;
  selectedBrandId: BrandId;
  selectedModel?: CatalogModel;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const showPinnedSelection = normalizedQuery.length === 0 && selectedModel && selectedBrand;
  const matchingModels = useMemo(
    () =>
      models.filter((model) => {
        if (showPinnedSelection && model.id === selectedModel.id) return false;
        if (!normalizedQuery) return true;
        return `${model.name} ${model.identifier}`.toLocaleLowerCase().includes(normalizedQuery);
      }),
    [models, normalizedQuery, selectedModel, showPinnedSelection],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  }

  function selectModel(value: string) {
    const model = models.find((item) => String(item.id) === value);
    if (!model) return;
    if (model.brandId !== selectedBrandId) onBrandChange(model.brandId);
    onModelChange(model.id);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover modal onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={t('pages.models.explorer.selection')}
          className="h-10 w-full min-w-0 justify-between rounded-lg border-border-strong bg-background px-3 text-left font-normal shadow-none transition-colors hover:bg-secondary/35"
          type="button"
          variant="outline"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <small className="shrink-0 text-xs text-muted-foreground">{selectedBrand?.name}</small>
            <span aria-hidden="true" className="text-muted-foreground/55">
              ·
            </span>
            <strong className="truncate font-mono text-sm">{selectedModel?.name}</strong>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <div className="relative border-b border-border p-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={t('pages.models.explorer.model.searchPlaceholder')}
            autoComplete="off"
            autoFocus
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('pages.models.explorer.model.searchPlaceholder')}
            value={query}
          />
        </div>
        <RadioGroup
          aria-label={t('pages.models.explorer.model.title')}
          className="max-h-72 touch-pan-y gap-0 overflow-y-auto overscroll-contain p-1"
          onValueChange={selectModel}
          value={selectedModel ? String(selectedModel.id) : undefined}
        >
          {showPinnedSelection ? (
            <div className="border-b border-border pb-1">
              <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-xs text-primary">
                <span>{t('pages.models.explorer.selection')}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {selectedBrand.name}
                </span>
              </div>
              <MarketplaceModelPickerItem model={selectedModel} selected />
            </div>
          ) : null}
          {matchingModels.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('pages.models.explorer.model.searchEmpty')}
            </p>
          ) : (
            brands.map((brand) => {
              const brandModels = matchingModels.filter((model) => model.brandId === brand.id);
              if (brandModels.length === 0) return null;
              return (
                <div className="pt-1" key={brand.id}>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{brand.name}</div>
                  {brandModels.map((model) => (
                    <MarketplaceModelPickerItem
                      key={model.id}
                      model={model}
                      selected={model.id === selectedModel?.id}
                    />
                  ))}
                </div>
              );
            })
          )}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  );
}

function MarketplaceModelPickerItem({
  model,
  selected,
}: {
  model: CatalogModel;
  selected: boolean;
}) {
  return (
    <RadioCardItem
      className="min-h-10 justify-start gap-3 rounded-md border-0 px-2 py-2 text-left font-normal shadow-none hover:bg-accent peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary"
      containerClassName="w-full"
      id={`marketplace-model-picker-${model.id}`}
      value={String(model.id)}
    >
      <Check
        aria-hidden="true"
        className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
      />
      <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{model.name}</span>
    </RadioCardItem>
  );
}

function QuickSelectionRow({
  children,
  hint,
  title,
}: {
  children: ReactNode;
  hint: string;
  title: string;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    moved: boolean;
    pointerId: number;
    scrollLeft: number;
    startX: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
    setCanScrollLeft(container.scrollLeft > 2);
    setCanScrollRight(container.scrollLeft < maximum - 2);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(updateScrollState);
    container.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    if (container.firstElementChild) observer.observe(container.firstElementChild);
    return () => {
      window.cancelAnimationFrame(frame);
      container.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  function scroll(direction: -1 | 1) {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({
      behavior: 'smooth',
      left: direction * Math.max(280, Math.round(container.clientWidth * 0.72)),
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    const container = event.currentTarget;
    dragRef.current = {
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: container.scrollLeft,
      startX: event.clientX,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  }

  function finishPointerDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    updateScrollState();
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    if (
      container.scrollWidth <= container.clientWidth ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
    ) {
      return;
    }
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  }

  return (
    <section className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          {title}
        </h2>
        <span className="hidden text-[10px] text-muted-foreground sm:block">{hint}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Button
          aria-label={t('pages.models.explorer.quick.previous')}
          className="shrink-0 rounded-full"
          disabled={!canScrollLeft}
          onClick={() => scroll(-1)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div
          className="marketplace-selector-scroll min-w-0 flex-1 cursor-grab select-none overflow-x-auto pb-1 active:cursor-grabbing"
          onClickCapture={(event) => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerCancel={finishPointerDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onWheel={handleWheel}
          ref={scrollRef}
        >
          {children}
        </div>
        <Button
          aria-label={t('pages.models.explorer.quick.next')}
          className="shrink-0 rounded-full"
          disabled={!canScrollRight}
          onClick={() => scroll(1)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
