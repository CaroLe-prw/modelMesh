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
import { Switch } from '@/components/ui/switch';
import type { BrandItem } from '@/features/account/api/brands';
import { listModelCatalog, type ModelCatalogEntry } from '@/features/account/api/model-catalog';
import type { ModelPriceOverride } from '@/features/account/api/models';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';
import {
  type CustomPriceTierForm,
  type PriceGroupView,
  customTierThresholdId,
  modelPriceGroups,
  optionalPrice,
  priceFieldId,
  priceInputKey,
} from '@/features/account/components/admin/model-pricing';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';

export interface NewModelDraft {
  brandId: string;
  identifier: string;
  name: string;
  priceOverrides: ModelPriceOverride[];
  status: 'disabled' | 'published';
}

type ModelFormField = 'brandId' | 'name';
type ModelFormError = 'duplicate' | 'invalid' | 'required';
type ModelFormErrors = Partial<Record<ModelFormField, ModelFormError>>;
type CustomPriceTierError = 'duplicate' | 'invalid';
type CustomPriceTierErrors = Partial<Record<number, CustomPriceTierError>>;

interface ModelFormState {
  brandId: string;
  customPriceTiers: CustomPriceTierForm[];
  ids: string[];
  isPublished: boolean;
  name: string;
  priceOverrides: Record<string, string>;
}

const MAX_MODELS_PER_BATCH = 100;

type CatalogListState =
  { status: 'error' | 'idle' | 'loading' } | { entries: ModelCatalogEntry[]; status: 'ready' };

function createInitialForm(): ModelFormState {
  return {
    brandId: '',
    customPriceTiers: [],
    ids: [],
    isPublished: true,
    name: '',
    priceOverrides: {},
  };
}

export function AddModelDialog({
  brandStatus,
  brands,
  existingModelKeys,
  onBrandRetry,
  onCreate,
}: {
  brandStatus: 'error' | 'loading' | 'ready';
  brands: BrandItem[];
  existingModelKeys: string[];
  onBrandRetry: () => void;
  onCreate: (drafts: NewModelDraft[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const fieldId = useId();
  const nextCustomTierId = useRef(0);
  const catalogListController = useRef<AbortController | null>(null);
  const [catalogList, setCatalogList] = useState<CatalogListState>({ status: 'idle' });
  const [catalogRefreshVersion, setCatalogRefreshVersion] = useState(0);
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
  const catalogEntries = catalogList.status === 'ready' ? catalogList.entries : [];
  const catalogOptions = catalogEntries.map((entry) => ({
    description: entry.modelId,
    label: entry.name,
    value: entry.modelId,
  }));
  const hasOfficialModels = catalogEntries.length > 0;
  const isCustomPricing = catalogList.status === 'ready' && !hasOfficialModels;
  const selectedCatalogEntries = form.ids
    .map((id) => catalogEntries.find((entry) => entry.modelId === id))
    .filter((entry): entry is ModelCatalogEntry => entry !== undefined);
  const selectedCatalogEntry =
    selectedCatalogEntries.length === 1 ? selectedCatalogEntries[0] : undefined;
  const usesSharedCatalogPricing = selectedCatalogEntries.length > 1;
  const supportsCustomContextTiers = isCustomPricing || usesSharedCatalogPricing;
  const priceGroups = modelPriceGroups(
    selectedCatalogEntry,
    supportsCustomContextTiers ? form.customPriceTiers : [],
  );
  const modelNameHint = hasOfficialModels
    ? 'catalogHint'
    : catalogList.status === 'ready'
      ? 'manualHint'
      : 'selectHint';

  useEffect(() => {
    if (!open || !form.brandId) {
      catalogListController.current?.abort();
      catalogListController.current = null;
      setCatalogList({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    catalogListController.current?.abort();
    catalogListController.current = controller;
    setCatalogList({ status: 'loading' });

    void listModelCatalog(form.brandId, controller.signal)
      .then((entries) => {
        if (catalogListController.current !== controller) return;
        setCatalogList({ entries, status: 'ready' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || catalogListController.current !== controller) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          setOpen(false);
          return;
        }
        setCatalogList({ status: 'error' });
      })
      .finally(() => {
        if (catalogListController.current === controller) {
          catalogListController.current = null;
        }
      });

    return () => controller.abort();
  }, [catalogRefreshVersion, form.brandId, open, setGuest]);

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    if (nextOpen) {
      setForm(createInitialForm());
      setErrors({});
      setCustomTierErrors({});
      setPriceErrors(new Set());
      setCatalogList({ status: 'idle' });
    } else {
      catalogListController.current?.abort();
      catalogListController.current = null;
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
      setCatalogList({ status: 'idle' });
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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const customModelId = modelIdentifierFromName(name);
    const nextErrors: ModelFormErrors = {};
    const nextCustomTierErrors: CustomPriceTierErrors = {};
    const nextPriceErrors = new Set<string>();
    const priceOverrides: ModelPriceOverride[] = [];

    if (!form.brandId) nextErrors.brandId = 'required';
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
        if (value === undefined) continue;
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
        firstInvalidField === 'name'
          ? document.getElementById(`${fieldId}-name`)
          : event.currentTarget.elements.namedItem(firstInvalidField);
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
            brandId: form.brandId,
            identifier: entry.modelId,
            name: entry.name,
            priceOverrides,
            status,
          }))
        : [
            {
              brandId: form.brandId,
              identifier: customModelId,
              name,
              priceOverrides,
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
                disabled={brandStatus !== 'ready' || brands.length === 0}
                emptyText={t(`${translationPath}.fields.brand.empty`)}
                id={`${fieldId}-brand-trigger`}
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
                    `${translationPath}.fields.name.${hasOfficialModels ? 'batchLabel' : 'label'}`,
                  )}
                </Label>
                {catalogList.status === 'ready' && hasOfficialModels ? (
                  <SearchableMultiSelect
                    aria-describedby={`${fieldId}-name-hint${errors.name ? ` ${fieldId}-name-error` : ''}`}
                    aria-invalid={errors.name ? true : undefined}
                    emptyText={t(`${translationPath}.catalog.empty`)}
                    id={`${fieldId}-name`}
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
                      !form.brandId ||
                      catalogList.status === 'loading' ||
                      catalogList.status === 'error'
                    }
                    id={`${fieldId}-name`}
                    maxLength={200}
                    name="name"
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder={
                      catalogList.status === 'loading'
                        ? t(`${translationPath}.catalog.loading`)
                        : t(`${translationPath}.fields.name.placeholder`)
                    }
                    value={form.name}
                  />
                )}
                <p className="text-xs leading-5 text-muted-foreground" id={`${fieldId}-name-hint`}>
                  {t(`${translationPath}.fields.name.${modelNameHint}`)}
                </p>
                {catalogList.status === 'error' && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-warning">
                    <AlertCircle aria-hidden="true" className="size-3.5" />
                    <span>{t(`${translationPath}.catalog.loadError`)}</span>
                    <Button
                      onClick={() => setCatalogRefreshVersion((version) => version + 1)}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw aria-hidden="true" />
                      {t(`${translationPath}.catalog.retry`)}
                    </Button>
                  </div>
                )}
                {errors.name && (
                  <p className="text-xs text-destructive" id={`${fieldId}-name-error`} role="alert">
                    {errorMessage('name')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{t(`${translationPath}.pricing.title`)}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t(
                      `${translationPath}.fields.${isCustomPricing ? 'customPriceHint' : usesSharedCatalogPricing ? 'batchPriceHint' : 'priceHint'}`,
                    )}
                  </p>
                </div>
                {supportsCustomContextTiers && (
                  <Button onClick={addCustomPriceTier} size="sm" type="button" variant="outline">
                    <Plus aria-hidden="true" />
                    {t(`${translationPath}.pricing.addContextTier`)}
                  </Button>
                )}
              </div>

              {priceGroups.map((priceGroup) => (
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
                  t={t}
                  translationPath={translationPath}
                  values={form.priceOverrides}
                />
              ))}
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
              disabled={
                isSubmitting ||
                catalogList.status === 'loading' ||
                brandStatus !== 'ready' ||
                brands.length === 0
              }
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
  defaultPrice,
  defaultPricePlaceholder,
  error,
  fieldId,
  label,
  name,
  onChange,
  value,
}: {
  defaultPrice?: number;
  defaultPricePlaceholder?: string;
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
          $
        </span>
        <Input
          aria-describedby={error ? `${fieldId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className="pl-7 font-mono"
          id={fieldId}
          inputMode="decimal"
          min="0"
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            defaultPricePlaceholder ?? (defaultPrice === undefined ? '0' : String(defaultPrice))
          }
          step="0.000001"
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
  customTierError,
  defaultPricePlaceholder,
  fieldId,
  group,
  onChange,
  onRemoveCustomTier,
  onUpdateCustomTier,
  priceErrors,
  t,
  translationPath,
  values,
}: {
  customTierError?: CustomPriceTierError;
  defaultPricePlaceholder?: string;
  fieldId: string;
  group: PriceGroupView;
  onChange: (key: string, value: string) => void;
  onRemoveCustomTier: (id: number) => void;
  onUpdateCustomTier: (id: number, threshold: string) => void;
  priceErrors: Set<string>;
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
          {group.group.type !== 'base' && (
            <Badge variant="secondary">{t(`${translationPath}.pricing.perMillion`)}</Badge>
          )}
          {customTierId !== undefined && (
            <Button
              aria-label={t(`${translationPath}.pricing.removeContextTier`)}
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
              defaultPrice={group.rates[rate]}
              defaultPricePlaceholder={defaultPricePlaceholder}
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

const standardRateOrder = [
  'input',
  'cache_read',
  'cache_write',
  'output',
  'reasoning',
  'input_audio',
  'output_audio',
];

function orderedRateNames(rates: Record<string, number | undefined>): string[] {
  return Object.keys(rates).sort((left, right) => {
    const leftIndex = standardRateOrder.indexOf(left);
    const rightIndex = standardRateOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function priceRateLabel(rate: string, t: TFunction, translationPath: string): string {
  return t(`${translationPath}.pricing.rates.${rate}`, {
    defaultValue: `${rate} / 1M`,
  });
}

function priceGroupTitle(groupView: PriceGroupView, t: TFunction, translationPath: string): string {
  const { group, maximumInclusive } = groupView;
  switch (group.type) {
    case 'base':
      if (maximumInclusive !== undefined) {
        return t(`${translationPath}.pricing.groups.baseUntil`, {
          size: formatTokenThreshold(maximumInclusive),
        });
      }
      return t(`${translationPath}.pricing.groups.base`);
    case 'contextOver200k':
      return t(`${translationPath}.pricing.groups.contextOver200k`);
    case 'tier':
      if (group.tierType === 'context') {
        if (group.size <= 0) return t(`${translationPath}.pricing.groups.customTier`);
        return maximumInclusive === undefined
          ? t(`${translationPath}.pricing.groups.contextTier`, {
              size: formatTokenThreshold(group.size),
            })
          : t(`${translationPath}.pricing.groups.contextRange`, {
              maximum: formatTokenThreshold(maximumInclusive),
              minimum: formatTokenThreshold(group.size),
            });
      }
      return t(`${translationPath}.pricing.groups.tier`, {
        size: formatTokenThreshold(group.size),
        type: group.tierType,
      });
    case 'experimentalMode':
      return t(`${translationPath}.pricing.groups.experimentalMode`, { mode: group.mode });
    case 'serviceTier':
      return t(`${translationPath}.pricing.groups.serviceTier`, { tier: group.tier });
  }
}

function formatTokenThreshold(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
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
