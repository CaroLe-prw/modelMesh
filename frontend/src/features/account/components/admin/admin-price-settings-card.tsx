import {
  AlertCircle,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getPriceSettings,
  priceCurrencies,
  updatePriceSettings,
  type PriceCurrency,
} from '@/features/account/api/price-settings';
import { clearMerchantModelOptionsCache } from '@/features/account/api/merchant-models';
import { PriceSettingsFields } from '@/features/account/components/admin/price-settings-fields';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

const translationPath = 'pages.account.sections.admin.settings.pricing';

interface EditablePriceSetting {
  exchangeRate: string;
  key: string;
  priceCurrency: PriceCurrency;
}

export function AdminPriceSettingsCard() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const fieldId = useId();
  const nextKey = useRef(1);
  const [rates, setRates] = useState<EditablePriceSetting[]>([
    { exchangeRate: '1', key: 'initial-usd', priceCurrency: 'USD' },
  ]);
  const [reviewThresholdPercent, setReviewThresholdPercent] = useState('0');
  const [effectiveDelayHours, setEffectiveDelayHours] = useState('0');
  const [loadVersion, setLoadVersion] = useState(0);
  const [loadState, setLoadState] = useState<'error' | 'loading' | 'ready'>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [policyInvalid, setPolicyInvalid] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoadState('loading');
    void getPriceSettings(controller.signal)
      .then((settings) => {
        if (!active) return;
        setRates(editableRates(settings.rates, 'loaded'));
        setReviewThresholdPercent(
          String(settings.reviewPolicy.priceIncreaseReviewThresholdPercent),
        );
        setEffectiveDelayHours(String(settings.reviewPolicy.approvedPriceEffectiveDelayHours));
        setValidationErrors(new Set());
        setPolicyInvalid(false);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setLoadState('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadVersion, setGuest]);

  function addRate() {
    const usedCurrencies = new Set(rates.map((rate) => rate.priceCurrency));
    const priceCurrency = priceCurrencies.find((currency) => !usedCurrencies.has(currency));
    if (!priceCurrency) return;
    const key = `new-${nextKey.current}`;
    nextKey.current += 1;
    setRates((current) => [
      ...current,
      { exchangeRate: priceCurrency === 'USD' ? '1' : '', key, priceCurrency },
    ]);
    setValidationErrors(new Set());
  }

  function updateCurrency(key: string, priceCurrency: PriceCurrency) {
    setRates((current) =>
      current.map((rate) =>
        rate.key === key
          ? { ...rate, exchangeRate: priceCurrency === 'USD' ? '1' : '', priceCurrency }
          : rate,
      ),
    );
    setValidationErrors((current) => withoutKey(current, key));
  }

  function updateExchangeRate(key: string, value: string) {
    setRates((current) =>
      current.map((rate) => (rate.key === key ? { ...rate, exchangeRate: value } : rate)),
    );
    setValidationErrors((current) => withoutKey(current, key));
  }

  function removeRate(key: string) {
    setRates((current) =>
      current.filter((rate) => rate.key !== key || rate.priceCurrency === 'USD'),
    );
    setValidationErrors((current) => withoutKey(current, key));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const duplicateCurrencies = duplicatePriceCurrencies(rates);
    const errors = new Set(
      rates
        .filter(
          (rate) =>
            duplicateCurrencies.has(rate.priceCurrency) ||
            !validExchangeRate(rate.priceCurrency, rate.exchangeRate),
        )
        .map((rate) => rate.key),
    );
    const threshold = Number(reviewThresholdPercent);
    const delayHours = Number(effectiveDelayHours);
    const policyIsValid =
      reviewThresholdPercent.trim().length > 0 &&
      Number.isFinite(threshold) &&
      threshold >= 0 &&
      threshold <= 1_000 &&
      decimalPlaces(reviewThresholdPercent) <= 2 &&
      effectiveDelayHours.trim().length > 0 &&
      Number.isInteger(delayHours) &&
      delayHours >= 0 &&
      delayHours <= 720;
    if (!rates.some((rate) => rate.priceCurrency === 'USD') || errors.size > 0 || !policyIsValid) {
      setValidationErrors(errors);
      setPolicyInvalid(!policyIsValid);
      const firstError = rates.find((rate) => errors.has(rate.key));
      if (firstError)
        document.getElementById(`${fieldId}-${firstError.key}-exchange-rate`)?.focus();
      else if (!policyIsValid) document.getElementById(`${fieldId}-review-threshold`)?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const settings = await updatePriceSettings({
        rates: rates.map(({ exchangeRate, priceCurrency }) => ({
          exchangeRate: Number(exchangeRate),
          priceCurrency,
        })),
        reviewPolicy: {
          approvedPriceEffectiveDelayHours: delayHours,
          priceIncreaseReviewThresholdPercent: threshold,
        },
      });
      setRates(editableRates(settings.rates, 'saved'));
      setReviewThresholdPercent(String(settings.reviewPolicy.priceIncreaseReviewThresholdPercent));
      setEffectiveDelayHours(String(settings.reviewPolicy.approvedPriceEffectiveDelayHours));
      setValidationErrors(new Set());
      setPolicyInvalid(false);
      clearMerchantModelOptionsCache();
      toast.success(t(`${translationPath}.feedback.saved`));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_PRICE_SETTINGS
            ? `${translationPath}.feedback.invalid`
            : `${translationPath}.feedback.saveError`,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="border-b py-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDollarSign aria-hidden="true" className="size-4 text-primary" />
          {t(`${translationPath}.title`)}
        </CardTitle>
        <CardDescription>{t(`${translationPath}.description`)}</CardDescription>
      </CardHeader>

      {loadState === 'error' ? (
        <CardContent className="p-5 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>{t(`${translationPath}.feedback.loadError`)}</AlertTitle>
            <AlertDescription>
              <Button
                onClick={() => setLoadVersion((version) => version + 1)}
                size="sm"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                {t(`${translationPath}.retry`)}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="p-5 sm:p-6">
            {loadState === 'loading' ? (
              <div
                aria-live="polite"
                className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {t(`${translationPath}.loading`)}
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t(`${translationPath}.configuredCount`, { count: rates.length })}
                  </p>
                  <Button
                    disabled={isSaving || rates.length >= priceCurrencies.length}
                    onClick={addRate}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus aria-hidden="true" />
                    {t(`${translationPath}.add`)}
                  </Button>
                </div>
                {rates.map((rate) => (
                  <PriceSettingsFields
                    currency={rate.priceCurrency}
                    disabled={isSaving}
                    disabledCurrencies={
                      new Set(
                        rates
                          .filter((candidate) => candidate.key !== rate.key)
                          .map((candidate) => candidate.priceCurrency),
                      )
                    }
                    error={validationErrors.has(rate.key)}
                    exchangeRate={rate.exchangeRate}
                    fieldId={`${fieldId}-${rate.key}`}
                    key={rate.key}
                    onCurrencyChange={(currency) => updateCurrency(rate.key, currency)}
                    onExchangeRateChange={(value) => updateExchangeRate(rate.key, value)}
                    onRemove={() => removeRate(rate.key)}
                  />
                ))}
                <div className="mt-2 grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
                  <div className="min-w-0 sm:col-span-2">
                    <strong className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                      {t(`${translationPath}.reviewPolicy.title`)}
                    </strong>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(`${translationPath}.reviewPolicy.description`)}
                    </p>
                  </div>
                  <div className="grid content-start gap-2">
                    <Label htmlFor={`${fieldId}-review-threshold`}>
                      {t(`${translationPath}.reviewPolicy.thresholdLabel`)}
                    </Label>
                    <div className="relative">
                      <Input
                        aria-invalid={policyInvalid || undefined}
                        className="pr-9 font-mono"
                        disabled={isSaving}
                        id={`${fieldId}-review-threshold`}
                        inputMode="decimal"
                        max="1000"
                        min="0"
                        onChange={(event) => {
                          setReviewThresholdPercent(event.target.value);
                          setPolicyInvalid(false);
                        }}
                        step="0.01"
                        type="number"
                        value={reviewThresholdPercent}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t(`${translationPath}.reviewPolicy.thresholdHelp`)}
                    </p>
                  </div>
                  <div className="grid content-start gap-2">
                    <Label htmlFor={`${fieldId}-effective-delay`}>
                      {t(`${translationPath}.reviewPolicy.delayLabel`)}
                    </Label>
                    <div className="relative">
                      <Clock3
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        aria-invalid={policyInvalid || undefined}
                        className="pl-9 pr-14 font-mono"
                        disabled={isSaving}
                        id={`${fieldId}-effective-delay`}
                        inputMode="numeric"
                        max="720"
                        min="0"
                        onChange={(event) => {
                          setEffectiveDelayHours(event.target.value);
                          setPolicyInvalid(false);
                        }}
                        step="1"
                        type="number"
                        value={effectiveDelayHours}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {t(`${translationPath}.reviewPolicy.hoursUnit`)}
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t(`${translationPath}.reviewPolicy.delayHelp`)}
                    </p>
                  </div>
                  {policyInvalid ? (
                    <p className="text-xs text-destructive sm:col-span-2" role="alert">
                      {t(`${translationPath}.reviewPolicy.invalid`)}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t px-5 py-4 sm:px-6">
            <Button disabled={loadState !== 'ready' || isSaving} type="submit">
              {isSaving ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {t(`${translationPath}.save`)}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

function decimalPlaces(value: string): number {
  const fraction = value.split('.')[1];
  return fraction?.length ?? 0;
}

function duplicatePriceCurrencies(rates: EditablePriceSetting[]): Set<PriceCurrency> {
  const seen = new Set<PriceCurrency>();
  const duplicates = new Set<PriceCurrency>();
  for (const rate of rates) {
    if (seen.has(rate.priceCurrency)) duplicates.add(rate.priceCurrency);
    seen.add(rate.priceCurrency);
  }
  return duplicates;
}

function withoutKey(values: Set<string>, key: string): Set<string> {
  if (!values.has(key)) return values;
  const next = new Set(values);
  next.delete(key);
  return next;
}

function validExchangeRate(currency: PriceCurrency, value: string): boolean {
  const rate = Number(value);
  return (
    value.trim().length > 0 &&
    Number.isFinite(rate) &&
    rate > 0 &&
    (currency !== 'USD' || rate === 1)
  );
}

function editableRates(
  rates: Awaited<ReturnType<typeof getPriceSettings>>['rates'],
  keyPrefix: string,
): EditablePriceSetting[] {
  const values = rates.map((rate) => ({
    exchangeRate: String(rate.exchangeRate),
    key: `${keyPrefix}-${rate.priceCurrency}`,
    priceCurrency: rate.priceCurrency,
  }));
  if (!values.some((rate) => rate.priceCurrency === 'USD')) {
    values.unshift({ exchangeRate: '1', key: `${keyPrefix}-USD`, priceCurrency: 'USD' });
  }
  return values.sort(
    (left, right) =>
      priceCurrencies.indexOf(left.priceCurrency) - priceCurrencies.indexOf(right.priceCurrency),
  );
}
