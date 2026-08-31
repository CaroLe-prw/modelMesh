import { LoaderCircle, Plus, Settings2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  ModelPricing,
  ModelPriceRates,
  ModelPriceTier,
} from '@/features/account/api/model-catalog';
import type {
  ModelItem,
  ModelPriceOverride,
  ModelPricingUpdateDraft,
} from '@/features/account/api/models';
import { PriceGroupFields } from '@/features/account/components/admin/add-model-dialog';
import {
  type CustomPriceTierForm,
  customTierThresholdId,
  modelPriceGroups,
  optionalPrice,
  priceFieldId,
  priceInputKey,
} from '@/features/account/components/admin/model-pricing';

type CustomPriceTierError = 'duplicate' | 'invalid';
type CustomPriceTierErrors = Partial<Record<number, CustomPriceTierError>>;

interface EditPricingForm {
  customPriceTiers: CustomPriceTierForm[];
  priceValues: Record<string, string>;
}

export function EditModelDialog({
  model,
  onOpenChange,
  onSave,
  open,
}: {
  model: ModelItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (model: ModelItem, draft: ModelPricingUpdateDraft) => Promise<void>;
  open: boolean;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const nextCustomTierId = useRef(0);
  const [customTierErrors, setCustomTierErrors] = useState<CustomPriceTierErrors>({});
  const [form, setForm] = useState<EditPricingForm>({
    customPriceTiers: [],
    priceValues: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceErrors, setPriceErrors] = useState<Set<string>>(new Set());
  const translationPath = 'pages.account.sections.admin.catalogManagement.models.editDialog';
  const createTranslationPath =
    'pages.account.sections.admin.catalogManagement.models.createDialog';
  const editorPricing = useMemo(() => (model ? pricingShape(model) : {}), [model]);
  const priceGroups = modelPriceGroups(
    model
      ? {
          modelId: model.identifier,
          name: model.name,
          pricing: editorPricing,
          providerId: model.brandId,
          source: 'models.dev',
          syncedAt: model.updatedAt,
        }
      : undefined,
    form.customPriceTiers,
  );

  useEffect(() => {
    if (!open || !model) return;
    const initial = initialPricingForm(model);
    nextCustomTierId.current = initial.customPriceTiers.length;
    setForm(initial);
    setCustomTierErrors({});
    setPriceErrors(new Set());
  }, [model, open]);

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
    const prefix = `custom-tier-${id}:`;
    setForm((current) => ({
      ...current,
      customPriceTiers: current.customPriceTiers.filter((tier) => tier.id !== id),
      priceValues: Object.fromEntries(
        Object.entries(current.priceValues).filter(([key]) => !key.startsWith(prefix)),
      ),
    }));
    setCustomTierErrors((current) => ({ ...current, [id]: undefined }));
    setPriceErrors((current) => new Set([...current].filter((key) => !key.startsWith(prefix))));
  }

  function updatePrice(key: string, value: string) {
    setForm((current) => ({
      ...current,
      priceValues: { ...current.priceValues, [key]: value },
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
    if (!model) return;
    const nextCustomTierErrors: CustomPriceTierErrors = {};
    const nextPriceErrors = new Set<string>();
    const priceOverrides: ModelPriceOverride[] = [];
    const tierIdsByThreshold = new Map<number, number[]>();

    for (const tier of form.customPriceTiers) {
      const threshold = Number(tier.threshold);
      if (!Number.isSafeInteger(threshold) || threshold <= 0) {
        nextCustomTierErrors[tier.id] = 'invalid';
        continue;
      }
      const ids = tierIdsByThreshold.get(threshold) ?? [];
      ids.push(tier.id);
      tierIdsByThreshold.set(threshold, ids);
    }
    for (const ids of tierIdsByThreshold.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) nextCustomTierErrors[id] = 'duplicate';
    }
    for (const group of priceGroups) {
      for (const rate of Object.keys(group.rates)) {
        const key = priceInputKey(group, rate);
        const price = optionalPrice(form.priceValues[key] ?? '');
        if (price === undefined) continue;
        if (!Number.isFinite(price) || price < 0) {
          nextPriceErrors.add(key);
        } else {
          priceOverrides.push({ group: group.group, price, rate });
        }
      }
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
      await onSave(model, {
        priceOverrides,
      });
      onOpenChange(false);
    } catch {
      // The parent shows the localized error and leaves this dialog open for correction.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-6 sm:py-6 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Settings2 aria-hidden="true" className="size-5" />
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
            {model && (
              <div className="rounded-xl border border-border bg-secondary/45 p-4">
                <strong className="block truncate font-mono text-sm">{model.name}</strong>
                <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                  {model.brandId} / {model.identifier}
                </span>
              </div>
            )}

            <div className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    {t(`${createTranslationPath}.pricing.title`)}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t(
                      `${translationPath}.${model?.catalogSource === 'models.dev' ? 'officialHint' : 'customHint'}`,
                    )}
                  </p>
                </div>
                <Button onClick={addCustomPriceTier} size="sm" type="button" variant="outline">
                  <Plus aria-hidden="true" />
                  {t(`${createTranslationPath}.pricing.addContextTier`)}
                </Button>
              </div>

              {priceGroups.map((group) => (
                <PriceGroupFields
                  customTierError={
                    group.customTierId === undefined
                      ? undefined
                      : customTierErrors[group.customTierId]
                  }
                  fieldId={fieldId}
                  group={group}
                  key={group.id}
                  onChange={updatePrice}
                  onRemoveCustomTier={removeCustomPriceTier}
                  onUpdateCustomTier={updateCustomPriceTier}
                  priceErrors={priceErrors}
                  currencySymbol="$"
                  priceUnitLabel={t(`${createTranslationPath}.pricing.perMillion`)}
                  t={t}
                  translationPath={createTranslationPath}
                  values={form.priceValues}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(`${translationPath}.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialPricingForm(model: ModelItem): EditPricingForm {
  const usesCatalogPricing = model.catalogSource === 'models.dev';
  const source = usesCatalogPricing ? model.pricingOverrides : model.defaultPricing;
  const defaultTierKeys = new Set(
    (usesCatalogPricing ? (model.defaultPricing.tiers ?? []) : []).map((tier) =>
      tierKey(tier.tierType, tier.size),
    ),
  );
  const customPriceTiers: CustomPriceTierForm[] = [];
  const customIds = new Map<string, number>();

  for (const tier of source.tiers ?? []) {
    const key = tierKey(tier.tierType, tier.size);
    if (defaultTierKeys.has(key)) continue;
    const id = customPriceTiers.length + 1;
    customIds.set(key, id);
    customPriceTiers.push({ id, threshold: String(tier.size) });
  }

  const priceValues: Record<string, string> = {};
  addPriceValues(priceValues, 'base', source.base);
  addPriceValues(priceValues, 'context-over-200k', source.contextOver200k);
  for (const tier of source.tiers ?? []) {
    const key = tierKey(tier.tierType, tier.size);
    const customId = customIds.get(key);
    addPriceValues(
      priceValues,
      customId === undefined ? `tier-${tier.tierType}-${tier.size}` : `custom-tier-${customId}`,
      tier.rates,
    );
  }
  for (const [mode, rates] of Object.entries(source.experimentalModes ?? {})) {
    addPriceValues(priceValues, `experimental-${mode}`, rates);
  }
  for (const [mode, tiers] of Object.entries(source.experimentalModeTiers ?? {})) {
    for (const tier of tiers) {
      addPriceValues(
        priceValues,
        `experimental-${mode}-tier-${tier.tierType}-${tier.size}`,
        tier.rates,
      );
    }
  }
  for (const [tier, rates] of Object.entries(source.serviceTiers ?? {})) {
    addPriceValues(priceValues, `service-${tier}`, rates);
  }

  return {
    customPriceTiers,
    priceValues,
  };
}

function addPriceValues(values: Record<string, string>, groupId: string, rates?: ModelPriceRates) {
  for (const [rate, price] of Object.entries(rates ?? {})) {
    values[`${groupId}:${rate}`] = String(price);
  }
}

function pricingShape(model: ModelItem): ModelPricing {
  const defaults = model.defaultPricing;
  const usesCatalogPricing = model.catalogSource === 'models.dev';
  const source = usesCatalogPricing ? model.pricingOverrides : defaults;
  const defaultTiers = usesCatalogPricing ? (defaults.tiers ?? []) : [];
  const sourceTiers = source.tiers ?? [];
  const tiers = defaultTiers.map((tier) => {
    const override = sourceTiers.find(
      (candidate) => candidate.tierType === tier.tierType && candidate.size === tier.size,
    );
    return { ...tier, rates: rateShape(tier.rates, override?.rates) };
  });

  return {
    base: rateShape(defaults.base, source.base, true),
    contextOver200k:
      defaults.contextOver200k || source.contextOver200k
        ? rateShape(defaults.contextOver200k, source.contextOver200k)
        : undefined,
    experimentalModes: groupShape(defaults.experimentalModes, source.experimentalModes),
    experimentalModeTiers: namedTierGroupShape(
      defaults.experimentalModeTiers,
      source.experimentalModeTiers,
    ),
    serviceTiers: groupShape(defaults.serviceTiers, source.serviceTiers),
    tiers,
  };
}

function namedTierGroupShape(
  defaults?: Record<string, ModelPriceTier[]>,
  overrides?: Record<string, ModelPriceTier[]>,
): Record<string, ModelPriceTier[]> | undefined {
  const names = new Set([...Object.keys(defaults ?? {}), ...Object.keys(overrides ?? {})]);
  if (names.size === 0) return undefined;
  return Object.fromEntries(
    [...names].map((name) => {
      const defaultTiers = defaults?.[name] ?? [];
      const overrideTiers = overrides?.[name] ?? [];
      const identities = new Set([
        ...defaultTiers.map((tier) => tierKey(tier.tierType, tier.size)),
        ...overrideTiers.map((tier) => tierKey(tier.tierType, tier.size)),
      ]);
      const tiers = [...identities].flatMap((identity) => {
        const defaultTier = defaultTiers.find(
          (tier) => tierKey(tier.tierType, tier.size) === identity,
        );
        const overrideTier = overrideTiers.find(
          (tier) => tierKey(tier.tierType, tier.size) === identity,
        );
        const shape = defaultTier ?? overrideTier;
        return shape
          ? [
              {
                ...shape,
                rates: rateShape(defaultTier?.rates, overrideTier?.rates),
              },
            ]
          : [];
      });
      return [name, tiers];
    }),
  );
}

function groupShape(
  defaults?: Record<string, ModelPriceRates>,
  overrides?: Record<string, ModelPriceRates>,
): Record<string, ModelPriceRates> | undefined {
  const names = new Set([...Object.keys(defaults ?? {}), ...Object.keys(overrides ?? {})]);
  if (names.size === 0) return undefined;
  return Object.fromEntries(
    [...names].map((name) => [name, rateShape(defaults?.[name], overrides?.[name])]),
  );
}

function rateShape(
  defaults?: ModelPriceRates,
  overrides?: ModelPriceRates,
  includeStandardRates = false,
): ModelPriceRates {
  const rates = new Set([...Object.keys(defaults ?? {}), ...Object.keys(overrides ?? {})]);
  if (includeStandardRates) {
    rates.add('input');
    rates.add('cache_read');
    rates.add('cache_write');
    rates.add('output');
  }
  return Object.fromEntries([...rates].map((rate) => [rate, defaults?.[rate] ?? 0]));
}

function tierKey(tierType: string, size: number): string {
  return `${tierType}:${size}`;
}
