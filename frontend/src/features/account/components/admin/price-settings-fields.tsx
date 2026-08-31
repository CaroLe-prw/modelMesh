import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { priceCurrencies, type PriceCurrency } from '@/features/account/api/price-settings';

const translationPath = 'pages.account.sections.admin.settings.pricing';

export function PriceSettingsFields({
  currency,
  disabled = false,
  disabledCurrencies,
  error = false,
  exchangeRate,
  fieldId,
  onCurrencyChange,
  onExchangeRateChange,
  onRemove,
}: {
  currency: PriceCurrency;
  disabled?: boolean;
  disabledCurrencies: ReadonlySet<PriceCurrency>;
  error?: boolean;
  exchangeRate: string;
  fieldId: string;
  onCurrencyChange: (currency: PriceCurrency) => void;
  onExchangeRateChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  function selectCurrency(value: string) {
    const nextCurrency = value as PriceCurrency;
    onCurrencyChange(nextCurrency);
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
      <div className="grid content-start gap-2">
        <Label htmlFor={`${fieldId}-price-currency`}>{t(`${translationPath}.currencyLabel`)}</Label>
        <Select
          disabled={disabled || currency === 'USD'}
          onValueChange={selectCurrency}
          value={currency}
        >
          <SelectTrigger className="w-full" id={`${fieldId}-price-currency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priceCurrencies.map((value) => (
              <SelectItem disabled={disabledCurrencies.has(value)} key={value} value={value}>
                {t(`${translationPath}.options.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-5 text-muted-foreground">
          {t(`${translationPath}.${currency === 'USD' ? 'defaultCurrencyHelp' : 'currencyHelp'}`)}
        </p>
      </div>

      <div className="grid content-start gap-2">
        <Label htmlFor={`${fieldId}-exchange-rate`}>
          {t(`${translationPath}.exchangeRateLabel`)}
        </Label>
        <div className="relative">
          <Input
            aria-describedby={`${fieldId}-exchange-rate-hint${error ? ` ${fieldId}-exchange-rate-error` : ''}`}
            aria-invalid={error || undefined}
            className="pr-14 font-mono"
            disabled={disabled || currency === 'USD'}
            id={`${fieldId}-exchange-rate`}
            inputMode="decimal"
            min="0.00000001"
            onChange={(event) => onExchangeRateChange(event.target.value)}
            step="0.00000001"
            type="number"
            value={exchangeRate}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground"
          >
            {currency}
          </span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground" id={`${fieldId}-exchange-rate-hint`}>
          {t(`${translationPath}.exchangeRateHint`, { currency })}
        </p>
        {error ? (
          <p
            className="text-xs text-destructive"
            id={`${fieldId}-exchange-rate-error`}
            role="alert"
          >
            {t(`${translationPath}.exchangeRateError`)}
          </p>
        ) : null}
      </div>

      {currency === 'USD' ? (
        <Badge className="justify-self-end sm:mt-8" variant="secondary">
          {t(`${translationPath}.defaultCurrency`)}
        </Badge>
      ) : (
        <Button
          aria-label={t(`${translationPath}.remove`, { currency })}
          className="justify-self-end sm:mt-7"
          disabled={disabled}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
