import { AlertCircle, Boxes, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableMultiSelect } from '@/components/common/searchable-multi-select';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from '@/components/ui/switch';
import type { BrandItem } from '@/features/account/api/brands';
import {
  lookupModelCatalog,
  type ModelCatalogEntry,
  type ModelCatalogOption,
} from '@/features/account/api/model-catalog';
import type { ModelBillingMode, ModelPriceOverride } from '@/features/account/api/models';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';
import {
  type CustomPriceTierForm,
  type PriceGroupView,
  customTierThresholdId,
  modelPriceGroups,
  optionalPrice,
  orderedRateNames,
  priceFieldId,
  priceGroupTitle,
  priceInputKey,
} from '@/features/account/components/admin/model-pricing';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';

export interface NewModelDraft {
  billingMode: ModelBillingMode;
  brandId: string;
  identifier: string;
  name: string;
  priceOverrides: ModelPriceOverride[];
  sortOrder: number;
  status: 'disabled' | 'published';
}

type ModelFormField = 'brandId' | 'name' | 'sortOrder';
type ModelFormError = 'duplicate' | 'invalid' | 'required';
type ModelFormErrors = Partial<Record<ModelFormField, ModelFormError>>;
type CustomPriceTierError = 'duplicate' | 'invalid';
type CustomPriceTierErrors = Partial<Record<number, CustomPriceTierError>>;

interface ModelFormState {
  billingMode: ModelBillingMode;
  brandId: string;
  customPriceTiers: CustomPriceTierForm[];
  ids: string[];
  isPublished: boolean;
  name: string;
  priceOverrides: Record<string, string>;
  sortOrder: string;
}

const MAX_MODELS_PER_BATCH = 100;

type CatalogDetailState =
  | { status: 'idle' }
  | { brandId: string; modelId: string; status: 'error' | 'loading' }
  | { brandId: string; entry: ModelCatalogEntry; modelId: string; status: 'ready' };

function createInitialForm(): ModelFormState {
  return {
    billingMode: 'token',
    brandId: '',
    customPriceTiers: [],
    ids: [],
    isPublished: true,
    name: '',
    priceOverrides: {},
    sortOrder: '0',
  };
}

export function AddModelDialog({
  brandStatus,
  brands,
  existingModelKeys,
  modelCatalogOptions,
  onBrandRetry,
  onCreate,
}: {
  brandStatus: 'error' | 'loading' | 'ready';
  brands: BrandItem[];
  existingModelKeys: string[];
  modelCatalogOptions: Record<string, ModelCatalogOption[]>;
  onBrandRetry: () => void;
  onCreate: (drafts: NewModelDraft[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const fieldId = useId();
  const nextCustomTierId = useRef(0);
  const catalogDetailController = useRef<AbortController | null>(null);
  const [catalogDetail, setCatalogDetail] = useState<CatalogDetailState>({ status: 'idle' });
  const [catalogDetailRefreshVersion, setCatalogDetailRefreshVersion] = useState(0);
  const [errors, setErrors] = useState<ModelFormErrors>({});
  const [customTierErrors, setCustomTierErrors] = useState<CustomPriceTierErrors>({});
  const [priceErrors, setPriceErrors] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ModelFormState>(createInitialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const translationPath = 'pages.account.sections.admin.catalogManagement.models.createDialog';
  const selectedBrand = brands.find((brand) => brand.id === form.brandId);
  const brandOptions = brands.map((brand) => ({
    description: brand.id,
    label: brand.name,
    value: brand.id,
  }));
  const catalogEntries = form.brandId ? modelCatalogOptions[form.brandId] : undefined;
  const availableCatalogEntries = catalogEntries ?? [];
  const catalogOptions = availableCatalogEntries.map((entry) => ({
    description: entry.modelId,
    label: entry.name,
    value: entry.modelId,
  }));
  const hasOfficialModels = availableCatalogEntries.length > 0;
  const isCatalogLoading =
    Boolean(form.brandId) && catalogEntries === undefined && brandStatus === 'loading';
  const showsCatalogSelector =
    Boolean(form.brandId) && (catalogEntries === undefined || hasOfficialModels);
  const isCustomPricing =
    Boolean(form.brandId) &&
    brandStatus === 'ready' &&
    catalogEntries !== undefined &&
    !hasOfficialModels;
  const selectedCatalogEntries = form.ids
    .map((id) => availableCatalogEntries.find((entry) => entry.modelId === id))
    .filter((entry): entry is ModelCatalogOption => entry !== undefined);
  const selectedModelId = form.ids.length === 1 ? form.ids[0] : undefined;
  const selectedCatalogEntry =
    catalogDetail.status === 'ready' &&
    catalogDetail.brandId === form.brandId &&
    catalogDetail.modelId === selectedModelId
      ? catalogDetail.entry
      : undefined;
  const isCatalogDetailError =
    catalogDetail.status === 'error' &&
    catalogDetail.brandId === form.brandId &&
    catalogDetail.modelId === selectedModelId;
  const isCatalogDetailPending =
    Boolean(selectedModelId) && selectedCatalogEntry === undefined && !isCatalogDetailError;
  const usesSharedCatalogPricing = selectedCatalogEntries.length > 1;
  const supportsCustomContextTiers = isCustomPricing || usesSharedCatalogPricing;
  const priceGroups: PriceGroupView[] =
    form.billingMode === 'request'
      ? [
          {
            group: { type: 'base' },
            id: 'request',
            rates: { request: undefined },
          },
        ]
      : modelPriceGroups(
          selectedCatalogEntry,
          supportsCustomContextTiers ? form.customPriceTiers : [],
        );
  const modelNameHint = hasOfficialModels
    ? 'catalogHint'
    : brandStatus === 'ready' && catalogEntries !== undefined
      ? 'manualHint'
      : 'selectHint';

  useEffect(() => {
    if (!open || !form.brandId || !selectedModelId) {
      catalogDetailController.current?.abort();
      catalogDetailController.current = null;
      setCatalogDetail({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    catalogDetailController.current?.abort();
    catalogDetailController.current = controller;
    setCatalogDetail({ brandId: form.brandId, modelId: selectedModelId, status: 'loading' });

    void lookupModelCatalog(form.brandId, selectedModelId, controller.signal)
      .then((entry) => {
        if (catalogDetailController.current !== controller) return;
        setCatalogDetail({
          brandId: form.brandId,
          entry,
          modelId: selectedModelId,
          status: 'ready',
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || catalogDetailController.current !== controller) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          setOpen(false);
          return;
        }
        setCatalogDetail({ brandId: form.brandId, modelId: selectedModelId, status: 'error' });
      })
      .finally(() => {
        if (catalogDetailController.current === controller) {
          catalogDetailController.current = null;
        }
      });

    return () => controller.abort();
  }, [catalogDetailRefreshVersion, form.brandId, open, selectedModelId, setGuest]);

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    if (nextOpen) {
      setForm(createInitialForm());
      setErrors({});
      setCustomTierErrors({});
      setPriceErrors(new Set());
      setCatalogDetail({ status: 'idle' });
    } else {
      catalogDetailController.current?.abort();
      catalogDetailController.current = null;
    }
    setOpen(nextOpen);
  }

  function updateField<Field extends keyof ModelFormState>(
    field: Field,
    value: ModelFormState[Field],
  ) {
    setForm((current) =>
      field === 'brandId'
        ? { ...createInitialForm(), brandId: String(value) }
        : { ...current, [field]: value },
    );
    if (field === 'brandId') {
      catalogDetailController.current?.abort();
      catalogDetailController.current = null;
      setCatalogDetail({ status: 'idle' });
      setCustomTierErrors({});
      setPriceErrors(new Set());
    }
    if (field === 'brandId' || field === 'name') {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function selectCatalogModels(modelIds: string[]) {
    setForm((current) =>
      modelIds.length > 1
        ? { ...current, ids: modelIds }
        : {
            ...current,
            customPriceTiers: [],
            ids: modelIds,
            priceOverrides: Object.fromEntries(
              Object.entries(current.priceOverrides).filter(
                ([key]) => !key.startsWith('custom-tier-'),
              ),
            ),
          },
    );
    setErrors((current) => ({
      ...current,
      name: undefined,
    }));
    setCustomTierErrors({});
    setPriceErrors(new Set());
  }

  function addCustomPriceTier() {
    const id = nextCustomTierId.current + 1;
    nextCustomTierId.current = id;
    setForm((current) => ({
      ...current,
      customPriceTiers: [...current.customPriceTiers, { id, threshold: '' }],
    }));
  }

  function updateCustomPriceTier(id: number, threshold: string) {
    setForm((current) => ({
      ...current,
      customPriceTiers: current.customPriceTiers.map((tier) =>
        tier.id === id ? { ...tier, threshold } : tier,
      ),
    }));
    setCustomTierErrors((current) => ({ ...current, [id]: undefined }));
  }

  function removeCustomPriceTier(id: number) {
    const priceKeyPrefix = `custom-tier-${id}:`;
    setForm((current) => ({
      ...current,
      customPriceTiers: current.customPriceTiers.filter((tier) => tier.id !== id),
      priceOverrides: Object.fromEntries(
        Object.entries(current.priceOverrides).filter(([key]) => !key.startsWith(priceKeyPrefix)),
      ),
    }));
    setCustomTierErrors((current) => ({ ...current, [id]: undefined }));
    setPriceErrors(
      (current) => new Set([...current].filter((key) => !key.startsWith(priceKeyPrefix))),
    );
  }

  function updatePriceOverride(key: string, value: string) {
    setForm((current) => ({
      ...current,
      priceOverrides: { ...current.priceOverrides, [key]: value },
    }));
    setPriceErrors((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function updateBillingMode(billingMode: ModelBillingMode) {
    setForm((current) => ({
      ...current,
      billingMode,
      customPriceTiers: [],
      priceOverrides: {},
    }));
    setCustomTierErrors({});
    setPriceErrors(new Set());
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const customModelId = modelIdentifierFromName(name);
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const nextErrors: ModelFormErrors = {};
    const nextCustomTierErrors: CustomPriceTierErrors = {};
    const nextPriceErrors = new Set<string>();
    const priceOverrides: ModelPriceOverride[] = [];

    if (!form.brandId) nextErrors.brandId = 'required';
    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 2_147_483_647 ||
      String(sortOrder) !== form.sortOrder.trim()
    ) {
      nextErrors.sortOrder = 'invalid';
    }
    if (!name && !hasOfficialModels) nextErrors.name = 'required';
    if (hasOfficialModels && selectedCatalogEntries.length === 0) {
      nextErrors.name = 'required';
    } else if (
      (hasOfficialModels
        ? selectedCatalogEntries.map((entry) => entry.modelId)
        : [customModelId]
      ).some((id) =>
        existingModelKeys.some(
          (key) => key.toLocaleLowerCase() === `${form.brandId}/${id}`.toLocaleLowerCase(),
        ),
      )
    ) {
      nextErrors.name = 'duplicate';
    }
    const customTierIdsByThreshold = new Map<number, number[]>();
    for (const tier of form.customPriceTiers) {
      const threshold = Number(tier.threshold);
      if (!Number.isSafeInteger(threshold) || threshold <= 0) {
        nextCustomTierErrors[tier.id] = 'invalid';
        continue;
      }
      const ids = customTierIdsByThreshold.get(threshold) ?? [];
      ids.push(tier.id);
      customTierIdsByThreshold.set(threshold, ids);
    }
    for (const ids of customTierIdsByThreshold.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) nextCustomTierErrors[id] = 'duplicate';
    }
    for (const priceGroup of priceGroups) {
      for (const rate of Object.keys(priceGroup.rates)) {
        const key = priceInputKey(priceGroup, rate);
        const value = optionalPrice(form.priceOverrides[key] ?? '');
        if (value === undefined) {
          if (form.billingMode === 'request') nextPriceErrors.add(key);
          continue;
        }
        if (!Number.isFinite(value) || value < 0) {
          nextPriceErrors.add(key);
        } else {
          priceOverrides.push({ group: priceGroup.group, price: value, rate });
        }
      }
    }

    const firstInvalidField = (Object.keys(nextErrors) as ModelFormField[])[0];
    if (firstInvalidField) {
      setErrors(nextErrors);
      const invalidControl =
        firstInvalidField === 'brandId'
          ? event.currentTarget.elements.namedItem(firstInvalidField)
          : document.getElementById(`${fieldId}-${firstInvalidField}`);
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }
    const firstInvalidTier = Object.keys(nextCustomTierErrors)[0];
    if (firstInvalidTier !== undefined) {
      setCustomTierErrors(nextCustomTierErrors);
      document.getElementById(customTierThresholdId(fieldId, Number(firstInvalidTier)))?.focus();
      return;
    }
    const firstInvalidPrice = nextPriceErrors.values().next().value;
    if (firstInvalidPrice) {
      setPriceErrors(nextPriceErrors);
      document.getElementById(priceFieldId(fieldId, firstInvalidPrice))?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const status: NewModelDraft['status'] = form.isPublished ? 'published' : 'disabled';
      const drafts: NewModelDraft[] = hasOfficialModels
        ? selectedCatalogEntries.map((entry) => ({
            billingMode: form.billingMode,
            brandId: form.brandId,
            identifier: entry.modelId,
            name: entry.name,
            priceOverrides,
            sortOrder,
            status,
          }))
        : [
            {
              billingMode: form.billingMode,
              brandId: form.brandId,
              identifier: customModelId,
              name,
              priceOverrides,
              sortOrder,
              status,
            },
          ];
      await onCreate(drafts);
      setOpen(false);
    } catch {
      // The parent reports the localized error and keeps the dialog open for correction.
    } finally {
      setIsSubmitting(false);
    }
  }

  function errorMessage(field: ModelFormField) {
    const error = errors[field];
    return error ? t(`${translationPath}.errors.${field}.${error}`) : undefined;
  }

  const previewName = hasOfficialModels
    ? selectedCatalogEntries.length === 1
      ? selectedCatalogEntries[0]?.name
      : selectedCatalogEntries.length > 1
        ? t(`${translationPath}.preview.selectedCount`, {
            count: selectedCatalogEntries.length,
          })
        : t(`${translationPath}.preview.nameFallback`)
    : form.name.trim() || t(`${translationPath}.preview.nameFallback`);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          {t('pages.account.sections.admin.catalogManagement.models.add')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-6 sm:py-6 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Boxes aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
              <DialogDescription className="mt-2">
                {t(`${translationPath}.description`)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="grid min-h-0 gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-xl border border-border bg-secondary/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(`${translationPath}.preview.label`)}
                </p>
                <Badge variant={form.isPublished ? 'default' : 'secondary'}>
                  {t(
                    `pages.account.sections.admin.catalogManagement.models.statuses.${form.isPublished ? 'published' : 'disabled'}`,
                  )}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <BrandAvatar
                  size="preview"
                  src={selectedBrand?.avatarUrl}
                  svg={selectedBrand?.avatarSvg}
                />
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-sm">{previewName}</strong>
                  {selectedBrand && (
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {selectedBrand.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-brand-trigger`}>
                {t(`${translationPath}.fields.brand.label`)}
              </Label>
              <SearchableSelect
                aria-describedby={errors.brandId ? `${fieldId}-brand-error` : undefined}
                aria-invalid={errors.brandId ? true : undefined}
                disabled={
                  brandStatus === 'error' || (brandStatus === 'ready' && brands.length === 0)
                }
                emptyText={t(`${translationPath}.fields.brand.empty`)}
                id={`${fieldId}-brand-trigger`}
                loading={brandStatus === 'loading'}
                loadingText={t(`${translationPath}.fields.brand.loading`)}
                name="brandId"
                onValueChange={(value) => updateField('brandId', value)}
                options={brandOptions}
                placeholder={t(`${translationPath}.fields.brand.placeholder`)}
                searchPlaceholder={t(`${translationPath}.fields.brand.searchPlaceholder`)}
                value={form.brandId}
              />
              {brandStatus === 'loading' && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  {t(`${translationPath}.fields.brand.loading`)}
                </p>
              )}
              {brandStatus === 'error' && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
                  <AlertCircle aria-hidden="true" className="size-3.5" />
                  <span>{t(`${translationPath}.fields.brand.loadError`)}</span>
                  <Button onClick={onBrandRetry} size="xs" type="button" variant="outline">
                    <RefreshCw aria-hidden="true" />
                    {t(`${translationPath}.fields.brand.retry`)}
                  </Button>
                </div>
              )}
              {errors.brandId && (
                <p className="text-xs text-destructive" id={`${fieldId}-brand-error`} role="alert">
                  {errorMessage('brandId')}
                </p>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid content-start gap-2">
                <Label htmlFor={`${fieldId}-name`}>
                  {t(
                    `${translationPath}.fields.name.${showsCatalogSelector ? 'batchLabel' : 'label'}`,
                  )}
                </Label>
                {showsCatalogSelector ? (
                  <SearchableMultiSelect
                    aria-describedby={`${fieldId}-name-hint${errors.name ? ` ${fieldId}-name-error` : ''}`}
                    aria-invalid={errors.name ? true : undefined}
                    disabled={brandStatus === 'error'}
                    emptyText={t(`${translationPath}.catalog.empty`)}
                    id={`${fieldId}-name`}
                    loading={isCatalogLoading}
                    loadingText={t(`${translationPath}.catalog.loading`)}
                    maxSelected={MAX_MODELS_PER_BATCH}
                    onValueChange={selectCatalogModels}
                    options={catalogOptions}
                    placeholder={t(`${translationPath}.catalog.placeholder`)}
                    searchPlaceholder={t(`${translationPath}.catalog.searchPlaceholder`)}
                    selectedCountText={(count) =>
                      t(`${translationPath}.catalog.selectedCount`, { count })
                    }
                    value={form.ids}
                  />
                ) : (
                  <Input
                    aria-describedby={`${fieldId}-name-hint${errors.name ? ` ${fieldId}-name-error` : ''}`}
                    aria-invalid={errors.name ? true : undefined}
                    autoComplete="off"
                    disabled={
                      !form.brandId || brandStatus !== 'ready' || catalogEntries === undefined
                    }
                    id={`${fieldId}-name`}
                    maxLength={200}
                    name="name"
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder={
                      isCatalogLoading
                        ? t(`${translationPath}.catalog.loading`)
                        : t(`${translationPath}.fields.name.placeholder`)
                    }
                    value={form.name}
                  />
                )}
                <p className="text-xs leading-5 text-muted-foreground" id={`${fieldId}-name-hint`}>
                  {t(`${translationPath}.fields.name.${modelNameHint}`)}
                </p>
                {errors.name && (
                  <p className="text-xs text-destructive" id={`${fieldId}-name-error`} role="alert">
                    {errorMessage('name')}
                  </p>
                )}
              </div>
            </div>

            {(isCustomPricing || selectedCatalogEntries.length > 0) && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor={`${fieldId}-billing-mode`}>
                    {t(`${translationPath}.fields.billingMode.label`)}
                  </Label>
                  <Select value={form.billingMode} onValueChange={updateBillingMode}>
                    <SelectTrigger id={`${fieldId}-billing-mode`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">
                        {t(`${translationPath}.fields.billingMode.token`)}
                      </SelectItem>
                      <SelectItem value="request">
                        {t(`${translationPath}.fields.billingMode.request`)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t(`${translationPath}.fields.billingMode.${form.billingMode}Hint`)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">
                      {t(`${translationPath}.pricing.title`)}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(
                        `${translationPath}.fields.${isCustomPricing ? 'customPriceHint' : usesSharedCatalogPricing ? 'batchPriceHint' : 'priceHint'}`,
                      )}
                    </p>
                  </div>
                  {form.billingMode === 'token' && supportsCustomContextTiers && (
                    <Button onClick={addCustomPriceTier} size="sm" type="button" variant="outline">
                      <Plus aria-hidden="true" />
                      {t(`${translationPath}.pricing.addContextTier`)}
                    </Button>
                  )}
                </div>

                {form.billingMode === 'token' && isCatalogDetailPending ? (
                  <div
                    aria-live="polite"
                    className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground"
                    role="status"
                  >
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                    <span>{t(`${translationPath}.pricing.loading`)}</span>
                  </div>
                ) : form.billingMode === 'token' && isCatalogDetailError ? (
                  <div className="flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm text-warning">
                    <AlertCircle aria-hidden="true" className="size-4" />
                    <span>{t(`${translationPath}.pricing.loadError`)}</span>
                    <Button
                      onClick={() => setCatalogDetailRefreshVersion((version) => version + 1)}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw aria-hidden="true" />
                      {t(`${translationPath}.pricing.retry`)}
                    </Button>
                  </div>
                ) : (
                  priceGroups.map((priceGroup) => (
                    <PriceGroupFields
                      customTierError={
                        priceGroup.customTierId === undefined
                          ? undefined
                          : customTierErrors[priceGroup.customTierId]
                      }
                      defaultPricePlaceholder={
                        usesSharedCatalogPricing
                          ? t(`${translationPath}.pricing.eachModelDefault`)
                          : undefined
                      }
                      fieldId={fieldId}
                      group={priceGroup}
                      key={priceGroup.id}
                      onChange={updatePriceOverride}
                      onRemoveCustomTier={removeCustomPriceTier}
                      onUpdateCustomTier={updateCustomPriceTier}
                      priceErrors={priceErrors}
                      currencySymbol="$"
                      priceUnitLabel={t(
                        `${translationPath}.pricing.${form.billingMode === 'request' ? 'perRequest' : 'perMillion'}`,
                      )}
                      t={t}
                      translationPath={translationPath}
                      values={form.priceOverrides}
                    />
                  ))
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-sortOrder`}>
                {t(`${translationPath}.fields.sortOrder.label`)}
              </Label>
              <Input
                aria-describedby={`${fieldId}-sortOrder-hint${errors.sortOrder ? ` ${fieldId}-sortOrder-error` : ''}`}
                aria-invalid={errors.sortOrder ? true : undefined}
                id={`${fieldId}-sortOrder`}
                inputMode="numeric"
                min={0}
                name="sortOrder"
                onChange={(event) => updateField('sortOrder', event.target.value)}
                step={1}
                type="number"
                value={form.sortOrder}
              />
              <p
                className="text-xs leading-5 text-muted-foreground"
                id={`${fieldId}-sortOrder-hint`}
              >
                {t(`${translationPath}.fields.sortOrder.hint`)}
              </p>
              {errors.sortOrder && (
                <p
                  className="text-xs text-destructive"
                  id={`${fieldId}-sortOrder-error`}
                  role="alert"
                >
                  {errorMessage('sortOrder')}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <Label htmlFor={`${fieldId}-published`}>
                  {t(`${translationPath}.fields.visibility.label`)}
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t(`${translationPath}.fields.visibility.hint`)}
                </p>
              </div>
              <Switch
                aria-label={t(`${translationPath}.fields.visibility.label`)}
                checked={form.isPublished}
                id={`${fieldId}-published`}
                onCheckedChange={(checked) => updateField('isPublished', checked)}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
            <Button
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button
              disabled={isSubmitting || brandStatus !== 'ready' || brands.length === 0}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {selectedCatalogEntries.length > 1
                ? t(`${translationPath}.submitMany`, { count: selectedCatalogEntries.length })
                : t(`${translationPath}.submit`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PriceField({
  currencySymbol = '$',
  defaultPrice,
  defaultPricePlaceholder,
  disabled,
  error,
  fieldId,
  label,
  name,
  onChange,
  value,
}: {
  currencySymbol?: string;
  defaultPrice?: number;
  defaultPricePlaceholder?: string;
  disabled?: boolean;
  error?: string;
  fieldId: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
          {currencySymbol}
        </span>
        <Input
          aria-describedby={error ? `${fieldId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className={currencySymbol.length > 1 ? 'pl-11 font-mono' : 'pl-7 font-mono'}
          disabled={disabled}
          id={fieldId}
          inputMode="decimal"
          min="0"
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            defaultPricePlaceholder ?? (defaultPrice === undefined ? '0' : String(defaultPrice))
          }
          step="0.00000001"
          type="number"
          value={value}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PriceGroupFields({
  currencySymbol,
  customTierError,
  defaultPricePlaceholder,
  disabled,
  fieldId,
  group,
  onChange,
  onRemoveCustomTier,
  onUpdateCustomTier,
  priceErrors,
  priceUnitLabel,
  t,
  translationPath,
  values,
}: {
  currencySymbol?: string;
  customTierError?: CustomPriceTierError;
  defaultPricePlaceholder?: string;
  disabled?: boolean;
  fieldId: string;
  group: PriceGroupView;
  onChange: (key: string, value: string) => void;
  onRemoveCustomTier: (id: number) => void;
  onUpdateCustomTier: (id: number, threshold: string) => void;
  priceErrors: Set<string>;
  priceUnitLabel?: string;
  t: TFunction;
  translationPath: string;
  values: Record<string, string>;
}) {
  const customTierId = group.customTierId;
  const thresholdFieldId =
    customTierId === undefined ? undefined : customTierThresholdId(fieldId, customTierId);
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">{priceGroupTitle(group, t, translationPath)}</strong>
        <div className="flex items-center gap-2">
          {(group.group.type !== 'base' || priceUnitLabel) && (
            <Badge variant="secondary">
              {priceUnitLabel ?? t(`${translationPath}.pricing.perMillion`)}
            </Badge>
          )}
          {customTierId !== undefined && (
            <Button
              aria-label={t(`${translationPath}.pricing.removeContextTier`)}
              disabled={disabled}
              onClick={() => onRemoveCustomTier(customTierId)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {customTierId !== undefined && thresholdFieldId !== undefined && (
        <div className="mb-4 grid gap-2">
          <Label htmlFor={thresholdFieldId}>
            {t(`${translationPath}.pricing.contextThreshold.label`)}
          </Label>
          <div className="relative">
            <Input
              aria-describedby={
                customTierError
                  ? `${thresholdFieldId}-hint ${thresholdFieldId}-error`
                  : `${thresholdFieldId}-hint`
              }
              aria-invalid={customTierError ? true : undefined}
              className="pr-16 font-mono"
              disabled={disabled}
              id={thresholdFieldId}
              inputMode="numeric"
              min="1"
              onChange={(event) => onUpdateCustomTier(customTierId, event.target.value)}
              placeholder={t(`${translationPath}.pricing.contextThreshold.placeholder`)}
              step="1000"
              type="number"
              value={group.thresholdValue ?? ''}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Token
            </span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground" id={`${thresholdFieldId}-hint`}>
            {t(`${translationPath}.pricing.contextThreshold.hint`)}
          </p>
          {customTierError && (
            <p className="text-xs text-destructive" id={`${thresholdFieldId}-error`} role="alert">
              {t(`${translationPath}.errors.contextTier.${customTierError}`)}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {orderedRateNames(group.rates).map((rate) => {
          const key = priceInputKey(group, rate);
          const error = priceErrors.has(key)
            ? t(`${translationPath}.errors.price.invalid`)
            : undefined;
          return (
            <PriceField
              currencySymbol={currencySymbol}
              defaultPrice={group.rates[rate]}
              defaultPricePlaceholder={defaultPricePlaceholder}
              disabled={disabled}
              error={error}
              fieldId={priceFieldId(fieldId, key)}
              key={key}
              label={priceRateLabel(rate, t, translationPath)}
              name={`price-${key}`}
              onChange={(value) => onChange(key, value)}
              value={values[key] ?? ''}
            />
          );
        })}
      </div>
    </div>
  );
}

function priceRateLabel(rate: string, t: TFunction, translationPath: string): string {
  return t(`${translationPath}.pricing.rates.${rate}`, {
    defaultValue: `${rate} / 1M`,
  });
}

function modelIdentifierFromName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  const asciiIdentifier = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
  if (asciiIdentifier) return asciiIdentifier;

  const codePoints = Array.from(name.trim(), (character) => character.codePointAt(0)?.toString(16))
    .filter((value): value is string => value !== undefined)
    .join('-');
  return `model-${codePoints}`.slice(0, 160).replace(/-+$/g, '');
}
