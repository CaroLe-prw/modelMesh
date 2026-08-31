import { AlertCircle, Boxes, LoaderCircle, PackagePlus, Save, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MerchantChannel } from '@/features/account/api/merchant-channels';
import type { ModelPricing } from '@/features/account/api/model-catalog';
import type { ModelPriceOverride } from '@/features/account/api/models';
import type { PriceCurrency, PriceSetting } from '@/features/account/api/price-settings';
import {
  clearMerchantModelOptionsCache,
  listMerchantModelOptions,
  readMerchantModelOptionsCache,
  refreshMerchantModelOptions,
  type MerchantModel,
  type MerchantModelDraft,
  type MerchantModelOption,
  type MerchantPriceConversionMode,
} from '@/features/account/api/merchant-models';
import { PriceGroupFields } from '@/features/account/components/admin/add-model-dialog';
import {
  modelPricingGroups,
  priceCurrencySymbol,
  priceInputKey,
  scaleModelPricing,
} from '@/features/account/components/admin/model-pricing';
import { filterAvailableMerchantModelOptions } from '@/features/account/components/merchant/merchant-model-options';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

const PRICE_SCALE = 100_000_000;
const MAX_PRICE_MULTIPLIER = 1_000_000;

interface MerchantModelDialogProps {
  channels: MerchantChannel[];
  disabled: boolean;
  existingModels: MerchantModel[];
  model: MerchantModel | null;
  onDelete: (model: MerchantModel) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: MerchantModelDraft) => Promise<void>;
  onUnauthenticated: () => void;
  open: boolean;
}

export function MerchantModelDialog({
  channels,
  disabled,
  existingModels,
  model,
  onDelete,
  onOpenChange,
  onSave,
  onUnauthenticated,
  open,
}: MerchantModelDialogProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const translationPath = 'pages.account.sections.merchant.models.dialog';
  const [channelId, setChannelId] = useState('');
  const [modelId, setModelId] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency | ''>('');
  const [conversionMode, setConversionMode] = useState<MerchantPriceConversionMode>('parity');
  const [priceMultiplier, setPriceMultiplier] = useState('1');
  const [hasManualPriceAdjustments, setHasManualPriceAdjustments] = useState(false);
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});
  const [priceErrors, setPriceErrors] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<MerchantModelOption[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [optionsState, setOptionsState] = useState<'error' | 'idle' | 'loading' | 'ready'>('idle');
  const [validationError, setValidationError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChannelId(model?.channelId ?? '');
    setModelId(model ? String(model.modelId) : '');
    setPriceCurrency('');
    setConversionMode('parity');
    setPriceMultiplier('1');
    setHasManualPriceAdjustments(false);
    setPriceValues(model ? priceValuesFromPricing(merchantModelEditablePricing(model)) : {});
    setPriceErrors(new Set());
    setValidationError(false);
    setDeleteOpen(false);
  }, [model, open]);

  useEffect(() => {
    if (!open || !channelId) {
      setOptions([]);
      setPriceSettings([]);
      setOptionsState('idle');
      return;
    }

    const cachedOptions = readMerchantModelOptionsCache(channelId);
    if (cachedOptions) {
      const cachedDefaultSettings = defaultPriceSettings(cachedOptions.priceSettings);
      setOptions(cachedOptions.models);
      setPriceSettings(cachedDefaultSettings);
      setPriceCurrency((current) =>
        cachedDefaultSettings.some((rate) => rate.priceCurrency === current)
          ? current
          : (cachedDefaultSettings[0]?.priceCurrency ?? ''),
      );
      setOptionsState('ready');
    } else {
      setOptionsState('loading');
    }

    let active = true;
    const request = cachedOptions
      ? refreshMerchantModelOptions(channelId)
      : listMerchantModelOptions(channelId);
    void request
      .then((response) => {
        if (!active) return;
        setOptions(response.models);
        setPriceSettings(response.priceSettings);
        setPriceCurrency((current) =>
          response.priceSettings.some((rate) => rate.priceCurrency === current)
            ? current
            : (response.priceSettings[0]?.priceCurrency ?? ''),
        );
        setOptionsState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) onUnauthenticated();
        setOptionsState('error');
      });

    return () => {
      active = false;
    };
  }, [channelId, onUnauthenticated, open]);

  const channelOptions = channels.map((channel) => ({
    description: channel.provider,
    label: channel.name,
    value: channel.id,
  }));
  const modelOptions = useMemo(() => {
    const availableOptions = filterAvailableMerchantModelOptions(
      options,
      existingModels,
      channelId,
      model?.id,
    );
    const values = availableOptions.map((option) => ({
      description: option.identifier,
      label: option.name,
      value: String(option.id),
    }));
    if (
      model &&
      model.channelId === channelId &&
      !options.some((item) => item.id === model.modelId)
    ) {
      values.unshift({
        description: model.modelIdentifier,
        label: model.modelName,
        value: String(model.modelId),
      });
    }
    return values;
  }, [channelId, existingModels, model, options]);
  const selectedOption = options.find((option) => String(option.id) === modelId);
  const selectedPriceSetting = priceSettings.find(
    (setting) => setting.priceCurrency === priceCurrency,
  );
  const selectedExchangeRate = priceConversionRate(selectedPriceSetting, conversionMode);
  const selectedPricing = useMemo(() => {
    const exchangeRate = selectedExchangeRate;
    if (exchangeRate === undefined) return undefined;
    if (selectedOption) {
      return scaleModelPricing(
        completeBasePricing(
          selectedOption.pricing,
          selectedOption.inputPrice,
          selectedOption.outputPrice,
        ),
        exchangeRate,
      );
    }
    if (model && model.channelId === channelId && String(model.modelId) === modelId) {
      return scaleModelPricing(merchantModelEditablePricing(model), exchangeRate);
    }
    return undefined;
  }, [channelId, model, modelId, selectedExchangeRate, selectedOption]);
  const priceGroups = useMemo(
    () => (selectedPricing ? modelPricingGroups(selectedPricing) : []),
    [selectedPricing],
  );
  const isEditing = model !== null;

  useEffect(() => {
    if (priceCurrency === 'USD' && conversionMode !== 'parity') {
      setConversionMode('parity');
    }
  }, [conversionMode, priceCurrency]);

  useEffect(() => {
    if (
      !open ||
      !model ||
      !selectedOption ||
      !selectedPriceSetting ||
      selectedExchangeRate === undefined ||
      model.channelId !== channelId ||
      model.modelId !== selectedOption.id
    ) {
      return;
    }
    const listingPricing = merchantModelEditablePricing(model);
    const listingPricingInConfiguredCurrency = scaleModelPricing(
      listingPricing,
      selectedExchangeRate,
    );
    const adminPricing = scaleModelPricing(
      completeBasePricing(
        selectedOption.pricing,
        selectedOption.inputPrice,
        selectedOption.outputPrice,
      ),
      selectedExchangeRate,
    );
    const detected = detectPriceMultiplier(adminPricing, listingPricingInConfiguredCurrency);
    setPriceValues(priceValuesFromPricing(listingPricingInConfiguredCurrency));
    setPriceMultiplier(detected.value);
    setHasManualPriceAdjustments(!detected.exact);
  }, [channelId, model, open, selectedExchangeRate, selectedOption, selectedPriceSetting]);

  function selectChannel(value: string) {
    const cachedOptions = readMerchantModelOptionsCache(value);
    const cachedDefaultSettings = defaultPriceSettings(cachedOptions?.priceSettings ?? []);
    setChannelId(value);
    setModelId('');
    setPriceCurrency(cachedDefaultSettings[0]?.priceCurrency ?? '');
    setConversionMode('parity');
    setPriceMultiplier('1');
    setHasManualPriceAdjustments(false);
    setOptions(cachedOptions?.models ?? []);
    setPriceSettings(cachedDefaultSettings);
    setOptionsState(cachedOptions ? 'ready' : 'loading');
    setPriceValues({});
    setPriceErrors(new Set());
    setValidationError(false);
  }

  function selectModel(value: string) {
    const selected = options.find((option) => String(option.id) === value);
    setModelId(value);
    setPriceMultiplier('1');
    setHasManualPriceAdjustments(false);
    if (selected) {
      const exchangeRate = selectedExchangeRate ?? 1;
      setPriceValues(
        priceValuesFromPricing(
          scaleModelPricing(
            completeBasePricing(selected.pricing, selected.inputPrice, selected.outputPrice),
            exchangeRate,
          ),
        ),
      );
    }
    setPriceErrors(new Set());
    setValidationError(false);
  }

  function selectPriceCurrency(value: string) {
    const nextCurrency = value as PriceCurrency;
    const nextSetting = priceSettings.find((setting) => setting.priceCurrency === nextCurrency);
    const nextConversionMode = nextCurrency === 'USD' ? 'parity' : conversionMode;
    const currentExchangeRate = selectedExchangeRate ?? 1;
    const nextExchangeRate = priceConversionRate(nextSetting, nextConversionMode) ?? 1;
    setPriceCurrency(nextCurrency);
    setConversionMode(nextConversionMode);
    setPriceValues((current) =>
      scalePriceValueRecord(current, nextExchangeRate / currentExchangeRate),
    );
    setPriceErrors(new Set());
    setValidationError(false);
  }

  function selectConversionMode(value: string) {
    if (!selectedPriceSetting || selectedPriceSetting.priceCurrency === 'USD') return;
    const nextConversionMode = value as MerchantPriceConversionMode;
    const currentExchangeRate = selectedExchangeRate ?? 1;
    const nextExchangeRate = priceConversionRate(selectedPriceSetting, nextConversionMode) ?? 1;
    setConversionMode(nextConversionMode);
    setPriceValues((current) =>
      scalePriceValueRecord(current, nextExchangeRate / currentExchangeRate),
    );
    setPriceErrors(new Set());
    setValidationError(false);
  }

  function updatePrice(key: string, value: string) {
    setHasManualPriceAdjustments(true);
    setPriceValues((current) => ({ ...current, [key]: value }));
    setPriceErrors((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setValidationError(false);
  }

  function updatePriceMultiplier(value: string) {
    setPriceMultiplier(value);
    setValidationError(false);
    const multiplier = Number(value);
    if (
      value.trim() === '' ||
      !Number.isFinite(multiplier) ||
      multiplier < 0 ||
      multiplier > MAX_PRICE_MULTIPLIER
    ) {
      return;
    }

    setPriceValues(priceValuesAtMultiplier(priceGroups, multiplier));
    setPriceErrors(new Set());
    setHasManualPriceAdjustments(false);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedModelId = Number(modelId);
    const parsedPriceMultiplier = Number(priceMultiplier);
    const nextPriceErrors = invalidPriceKeys(priceGroups, priceValues);
    const baseGroup = priceGroups.find((group) => group.group.type === 'base');
    const parsedInputPrice = Number(
      baseGroup ? priceValues[priceInputKey(baseGroup, 'input')] : Number.NaN,
    );
    const parsedOutputPrice = Number(
      baseGroup ? priceValues[priceInputKey(baseGroup, 'output')] : Number.NaN,
    );
    const valid =
      channelId.length > 0 &&
      Number.isSafeInteger(parsedModelId) &&
      parsedModelId > 0 &&
      selectedOption !== undefined &&
      selectedPriceSetting !== undefined &&
      selectedExchangeRate !== undefined &&
      priceMultiplier.trim().length > 0 &&
      Number.isFinite(parsedPriceMultiplier) &&
      parsedPriceMultiplier >= 0 &&
      parsedPriceMultiplier <= MAX_PRICE_MULTIPLIER &&
      Number.isFinite(parsedInputPrice) &&
      parsedInputPrice >= 0 &&
      Number.isFinite(parsedOutputPrice) &&
      parsedOutputPrice >= 0 &&
      priceGroups.length > 0 &&
      nextPriceErrors.size === 0;

    if (!valid) {
      setPriceErrors(nextPriceErrors);
      setValidationError(true);
      return;
    }

    const priceOverrides = priceOverridesFromValues(priceGroups, priceValues);

    try {
      await onSave({
        channelId,
        conversionMode,
        exchangeRate: selectedExchangeRate,
        inputPrice: parsedInputPrice,
        modelId: parsedModelId,
        outputPrice: parsedOutputPrice,
        priceCurrency: selectedPriceSetting.priceCurrency,
        priceOverrides,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.code === API_ERROR_CODE.MERCHANT_MODEL_PRICE_SETTINGS_CHANGED
      ) {
        clearMerchantModelOptionsCache();
        setOptionsState('loading');
        try {
          const response = await listMerchantModelOptions(channelId);
          const refreshedSetting =
            response.priceSettings.find((rate) => rate.priceCurrency === priceCurrency) ??
            response.priceSettings[0];
          setOptions(response.models);
          setPriceSettings(response.priceSettings);
          setPriceCurrency(refreshedSetting?.priceCurrency ?? '');
          if (refreshedSetting?.priceCurrency === 'USD') setConversionMode('parity');
          setOptionsState('ready');
          if (!model) {
            const refreshedOption = response.models.find((item) => item.id === parsedModelId);
            if (refreshedOption && refreshedSetting) {
              const refreshedExchangeRate = priceConversionRate(
                refreshedSetting,
                refreshedSetting.priceCurrency === 'USD' ? 'parity' : conversionMode,
              );
              setPriceMultiplier('1');
              setPriceValues(
                priceValuesFromPricing(
                  scaleModelPricing(
                    completeBasePricing(
                      refreshedOption.pricing,
                      refreshedOption.inputPrice,
                      refreshedOption.outputPrice,
                    ),
                    refreshedExchangeRate ?? 1,
                  ),
                ),
              );
              setHasManualPriceAdjustments(false);
            }
          }
        } catch (refreshError: unknown) {
          if (refreshError instanceof ApiError && refreshError.status === 401) onUnauthenticated();
          setOptionsState('error');
        }
      }
      // The parent reports the localized API error and keeps the dialog open for correction.
    }
  }

  async function confirmDelete() {
    if (!model) return;
    try {
      await onDelete(model);
      setDeleteOpen(false);
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps the confirmation open for retry.
    }
  }

  return (
    <>
      <Dialog onOpenChange={(nextOpen) => !disabled && onOpenChange(nextOpen)} open={open}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
          closeLabel={t('common.close')}
        >
          <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-6 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Boxes aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle>
                  {t(`${translationPath}.${isEditing ? 'editTitle' : 'createTitle'}`)}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {t(`${translationPath}.${isEditing ? 'editDescription' : 'createDescription'}`)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${fieldId}-channel`}>
                  {t(`${translationPath}.fields.channel`)}
                </Label>
                <SearchableSelect
                  disabled={disabled || isEditing}
                  emptyText={t(`${translationPath}.emptyChannels`)}
                  id={`${fieldId}-channel`}
                  name="channelId"
                  onValueChange={selectChannel}
                  options={channelOptions}
                  placeholder={t(`${translationPath}.channelPlaceholder`)}
                  searchPlaceholder={t(`${translationPath}.channelSearch`)}
                  value={channelId}
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${fieldId}-model`}>{t(`${translationPath}.fields.model`)}</Label>
                <SearchableSelect
                  disabled={disabled || isEditing || !channelId || optionsState === 'loading'}
                  emptyText={t(`${translationPath}.emptyModels`)}
                  id={`${fieldId}-model`}
                  name="modelId"
                  onValueChange={selectModel}
                  options={modelOptions}
                  placeholder={
                    optionsState === 'loading'
                      ? t(`${translationPath}.loadingModels`)
                      : t(`${translationPath}.modelPlaceholder`)
                  }
                  searchPlaceholder={t(`${translationPath}.modelSearch`)}
                  value={modelId}
                />
                {isEditing ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t(`${translationPath}.identityLockedHint`)}
                  </p>
                ) : null}
                {optionsState === 'error' ? (
                  <p className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle aria-hidden="true" className="size-3.5" />
                    {t(`${translationPath}.modelLoadError`)}
                  </p>
                ) : null}
              </div>

              {priceGroups.length > 0 ? (
                <div className="grid gap-3 sm:col-span-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t(`${translationPath}.pricing.title`)}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(`${translationPath}.pricing.hint`)}
                    </p>
                  </div>

                  <div className="grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-3">
                    <div className="min-w-0 sm:col-span-3">
                      <strong className="text-sm font-medium">
                        {t(`${translationPath}.pricing.multiplier.label`)}
                      </strong>
                      <p
                        className="mt-2 text-xs leading-5 text-muted-foreground"
                        id={`${fieldId}-price-multiplier-hint`}
                      >
                        {t(`${translationPath}.pricing.multiplier.hint`)}
                      </p>
                      {hasManualPriceAdjustments ? (
                        <p className="mt-1 text-xs text-warning">
                          {t(`${translationPath}.pricing.multiplier.customized`)}
                        </p>
                      ) : null}
                      {selectedPriceSetting ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t(
                            `${translationPath}.pricing.${conversionMode === 'parity' ? 'paritySummary' : 'adminExchangeRate'}`,
                            {
                              currency: selectedPriceSetting.priceCurrency,
                              rate: selectedPriceSetting.exchangeRate,
                            },
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid min-w-0 content-start gap-2">
                      <Label htmlFor={`${fieldId}-price-currency`}>
                        {t(`${translationPath}.fields.priceCurrency`)}
                      </Label>
                      <Select
                        disabled={
                          disabled || optionsState !== 'ready' || priceSettings.length === 0
                        }
                        onValueChange={selectPriceCurrency}
                        value={priceCurrency}
                      >
                        <SelectTrigger id={`${fieldId}-price-currency`} className="w-full">
                          <SelectValue
                            placeholder={t(`${translationPath}.priceCurrencyPlaceholder`)}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {priceSettings.map((setting) => (
                            <SelectItem key={setting.priceCurrency} value={setting.priceCurrency}>
                              {t(
                                `${translationPath}.pricing.currency.options.${setting.priceCurrency}`,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid min-w-0 content-start gap-2">
                      <Label htmlFor={`${fieldId}-conversion-mode`}>
                        {t(`${translationPath}.pricing.conversionMode.label`)}
                      </Label>
                      <Select
                        disabled={disabled || !selectedPriceSetting || priceCurrency === 'USD'}
                        onValueChange={selectConversionMode}
                        value={conversionMode}
                      >
                        <SelectTrigger id={`${fieldId}-conversion-mode`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parity">
                            {t(`${translationPath}.pricing.conversionMode.parity`)}
                          </SelectItem>
                          <SelectItem value="fixedRate">
                            {t(`${translationPath}.pricing.conversionMode.fixedRate`)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid content-start gap-2">
                      <Label htmlFor={`${fieldId}-price-multiplier`}>
                        {t(`${translationPath}.pricing.multiplier.inputLabel`)}
                      </Label>
                      <div className="relative">
                        <Input
                          aria-describedby={`${fieldId}-price-multiplier-hint`}
                          className="pr-10 font-mono"
                          disabled={disabled || !selectedOption || !selectedPriceSetting}
                          id={`${fieldId}-price-multiplier`}
                          inputMode="decimal"
                          max={MAX_PRICE_MULTIPLIER}
                          min="0"
                          onChange={(event) => updatePriceMultiplier(event.target.value)}
                          step="0.01"
                          type="number"
                          value={priceMultiplier}
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground"
                        >
                          ×
                        </span>
                      </div>
                    </div>
                  </div>

                  {priceGroups.map((group) => (
                    <PriceGroupFields
                      currencySymbol={priceCurrencySymbol(
                        selectedPriceSetting?.priceCurrency ?? 'USD',
                      )}
                      disabled={disabled}
                      fieldId={`${fieldId}-merchant`}
                      group={group}
                      key={group.id}
                      onChange={updatePrice}
                      onRemoveCustomTier={() => undefined}
                      onUpdateCustomTier={() => undefined}
                      priceErrors={priceErrors}
                      priceUnitLabel={t(`${translationPath}.pricing.perMillionCurrency`, {
                        currency: selectedPriceSetting?.priceCurrency ?? 'USD',
                      })}
                      t={t}
                      translationPath={translationPath}
                      values={priceValues}
                    />
                  ))}
                </div>
              ) : null}

              {validationError ? (
                <p className="text-xs text-destructive sm:col-span-2">
                  {t(`${translationPath}.invalid`)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {model ? (
                <Button
                  disabled={disabled}
                  onClick={() => setDeleteOpen(true)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" />
                  {t(`${translationPath}.delete`)}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  disabled={disabled}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  {t(`${translationPath}.cancel`)}
                </Button>
                <Button
                  disabled={disabled || optionsState !== 'ready' || !selectedPriceSetting}
                  type="submit"
                >
                  {disabled ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : isEditing ? (
                    <Save aria-hidden="true" />
                  ) : (
                    <PackagePlus aria-hidden="true" />
                  )}
                  {t(`${translationPath}.${isEditing ? 'save' : 'create'}`)}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`${translationPath}.deleteDialog.title`)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(`${translationPath}.deleteDialog.description`, {
                name: model?.modelIdentifier ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>
              {t(`${translationPath}.deleteDialog.cancel`)}
            </AlertDialogCancel>
            <AlertDialogAction disabled={disabled} onClick={() => void confirmDelete()}>
              {t(`${translationPath}.deleteDialog.confirm`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function completeBasePricing(
  pricing: ModelPricing | undefined,
  inputPrice: number,
  outputPrice: number,
): ModelPricing {
  const base = pricing?.base;

  return {
    ...(pricing ?? {}),
    base: {
      ...base,
      input: base?.input ?? inputPrice,
      output: base?.output ?? outputPrice,
    },
  };
}

function merchantModelEditablePricing(model: MerchantModel): ModelPricing {
  const price = model.pendingPrice;
  return completeBasePricing(
    price?.pricing ?? model.pricing,
    price?.inputPrice ?? model.inputPrice,
    price?.outputPrice ?? model.outputPrice,
  );
}

function defaultPriceSettings(settings: PriceSetting[]): PriceSetting[] {
  const usd = settings.find((setting) => setting.priceCurrency === 'USD');
  return usd ? [usd] : [];
}

function priceConversionRate(
  setting: PriceSetting | undefined,
  mode: MerchantPriceConversionMode,
): number | undefined {
  if (!setting) return undefined;
  return mode === 'parity' ? 1 : setting.exchangeRate;
}

function scalePriceValueRecord(
  values: Record<string, string>,
  factor: number,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const price = Number(value);
      return [
        key,
        value.trim() === '' || !Number.isFinite(price) ? value : formatScaledPrice(price, factor),
      ];
    }),
  );
}

function priceValuesFromPricing(pricing: ModelPricing): Record<string, string> {
  return Object.fromEntries(
    modelPricingGroups(pricing).flatMap((group) =>
      Object.entries(group.rates).flatMap(([rate, price]) =>
        price === undefined ? [] : [[priceInputKey(group, rate), String(price)]],
      ),
    ),
  );
}

function priceValuesAtMultiplier(
  groups: ReturnType<typeof modelPricingGroups>,
  multiplier: number,
): Record<string, string> {
  return Object.fromEntries(
    groups.flatMap((group) =>
      Object.entries(group.rates).flatMap(([rate, price]) =>
        price === undefined
          ? []
          : [[priceInputKey(group, rate), formatScaledPrice(price, multiplier)]],
      ),
    ),
  );
}

function detectPriceMultiplier(
  referencePricing: ModelPricing,
  listingPricing: ModelPricing,
): { exact: boolean; value: string } {
  const referenceValues = priceValuesFromPricing(referencePricing);
  const listingValues = priceValuesFromPricing(listingPricing);
  const comparablePrices: { listing: number; reference: number }[] = [];
  let exact = true;

  for (const [key, referenceValue] of Object.entries(referenceValues)) {
    const referencePrice = Number(referenceValue);
    const listingPrice = Number(listingValues[key]);
    if (!Number.isFinite(listingPrice)) {
      exact = false;
      continue;
    }
    if (referencePrice === 0) {
      if (listingPrice !== 0) exact = false;
      continue;
    }
    comparablePrices.push({ listing: listingPrice, reference: referencePrice });
  }

  comparablePrices.sort((left, right) => right.reference - left.reference);
  const multiplier = comparablePrices[0]
    ? comparablePrices[0].listing / comparablePrices[0].reference
    : 1;
  if (
    comparablePrices.some(
      ({ listing, reference }) =>
        formatScaledPrice(reference, multiplier) !== formatScaledPrice(listing, 1),
    ) ||
    Object.keys(listingValues).some((key) => !(key in referenceValues))
  ) {
    exact = false;
  }

  return { exact, value: formatMultiplier(multiplier) };
}

function formatScaledPrice(price: number, multiplier: number): string {
  const scaled = Math.round(price * multiplier * PRICE_SCALE) / PRICE_SCALE;
  return scaled.toFixed(8).replace(/\.?0+$/, '');
}

function formatMultiplier(multiplier: number): string {
  return multiplier.toFixed(8).replace(/\.?0+$/, '');
}

function invalidPriceKeys(
  groups: ReturnType<typeof modelPricingGroups>,
  values: Record<string, string>,
): Set<string> {
  const errors = new Set<string>();
  for (const group of groups) {
    for (const rate of Object.keys(group.rates)) {
      const key = priceInputKey(group, rate);
      const price = Number(values[key]);
      if (values[key]?.trim() === '' || !Number.isFinite(price) || price < 0) errors.add(key);
    }
  }
  return errors;
}

function priceOverridesFromValues(
  groups: ReturnType<typeof modelPricingGroups>,
  values: Record<string, string>,
): ModelPriceOverride[] {
  return groups.flatMap((group) =>
    Object.keys(group.rates).map((rate) => ({
      group: group.group,
      price: Number(values[priceInputKey(group, rate)]),
      rate,
    })),
  );
}
