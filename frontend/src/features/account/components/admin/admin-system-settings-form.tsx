import { AlertCircle, LoaderCircle, RefreshCw, Save, Settings2, WalletCards } from 'lucide-react';
import { useEffect, useId, useState, type SubmitEvent } from 'react';
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
import { Switch } from '@/components/ui/switch';
import type {
  MerchantSettlementMethod,
  MerchantSettlementNetwork,
} from '@/features/account/api/merchant-profile';
import {
  getAdminSystemSettings,
  merchantSettlementMethods,
  merchantSettlementNetworks,
  updateAdminSystemSettings,
} from '@/features/account/api/system-settings';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

const translationPath = 'pages.account.sections.admin.settings';

export function AdminSystemSettingsForm() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const fieldId = useId();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [withdrawalMinimum, setWithdrawalMinimum] = useState('10.00');
  const [withdrawalFeeRate, setWithdrawalFeeRate] = useState('1.50');
  const [platformRate, setPlatformRate] = useState('8.00');
  const [enabledMethods, setEnabledMethods] = useState<MerchantSettlementMethod[]>([]);
  const [enabledNetworks, setEnabledNetworks] = useState<MerchantSettlementNetwork[]>([]);
  const [loadVersion, setLoadVersion] = useState(0);
  const [loadState, setLoadState] = useState<'error' | 'loading' | 'ready'>('loading');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoadState('loading');
    void getAdminSystemSettings(controller.signal)
      .then((settings) => {
        if (!active) return;
        setRegistrationEnabled(settings.registrationEnabled);
        setWithdrawalMinimum(settings.finance.withdrawalMinimumUsd);
        setWithdrawalFeeRate(settings.finance.withdrawalFeePercent);
        setPlatformRate(settings.finance.platformFeePercent);
        setEnabledMethods(settings.settlement.enabledMethods);
        setEnabledNetworks(settings.settlement.enabledNetworks);
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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !validDecimal(withdrawalMinimum, false) ||
      !validRate(withdrawalFeeRate) ||
      !validRate(platformRate) ||
      (enabledMethods.includes('usdt') && enabledNetworks.length === 0)
    ) {
      toast.error(t(`${translationPath}.feedback.invalid`));
      return;
    }

    setIsSaving(true);
    try {
      const settings = await updateAdminSystemSettings({
        registrationEnabled,
        finance: {
          withdrawalMinimumUsd: withdrawalMinimum,
          withdrawalFeePercent: withdrawalFeeRate,
          platformFeePercent: platformRate,
        },
        settlement: { enabledMethods, enabledNetworks },
      });
      setRegistrationEnabled(settings.registrationEnabled);
      setWithdrawalMinimum(settings.finance.withdrawalMinimumUsd);
      setWithdrawalFeeRate(settings.finance.withdrawalFeePercent);
      setPlatformRate(settings.finance.platformFeePercent);
      setEnabledMethods(settings.settlement.enabledMethods);
      setEnabledNetworks(settings.settlement.enabledNetworks);
      toast.success(t(`${translationPath}.feedback.saved`));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_SYSTEM_SETTINGS
            ? `${translationPath}.feedback.invalid`
            : `${translationPath}.feedback.saveError`,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === 'error') {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>{t(`${translationPath}.feedback.loadError`)}</AlertTitle>
            <AlertDescription>
              <Button
                onClick={() => setLoadVersion((version) => version + 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                {t(`${translationPath}.feedback.retry`)}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loadState === 'loading') {
    return (
      <Card className="grid min-h-52 place-items-center shadow-sm">
        <div aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {t(`${translationPath}.feedback.loading`)}
        </div>
      </Card>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 aria-hidden="true" className="size-4 text-primary" />
            {t(`${translationPath}.registration.title`)}
          </CardTitle>
          <CardDescription>{t(`${translationPath}.registration.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <SettingSwitch
            checked={registrationEnabled}
            description={t(`${translationPath}.registration.help`)}
            disabled={isSaving}
            id={`${fieldId}-registration-enabled`}
            label={t(`${translationPath}.registration.label`)}
            onCheckedChange={setRegistrationEnabled}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards aria-hidden="true" className="size-4 text-primary" />
            {t(`${translationPath}.settlement.title`)}
          </CardTitle>
          <CardDescription>{t(`${translationPath}.settlement.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-5 sm:p-6">
          <SettingsGroup
            description={t(`${translationPath}.settlement.methods.description`)}
            title={t(`${translationPath}.settlement.methods.title`)}
          >
            {merchantSettlementMethods.map((method) => (
              <SettingSwitch
                checked={enabledMethods.includes(method)}
                description={t(`${translationPath}.settlement.methods.help.${method}`)}
                disabled={isSaving}
                id={`${fieldId}-method-${method}`}
                key={method}
                label={t(`pages.account.sections.merchant.profile.settlement.methods.${method}`)}
                onCheckedChange={(checked) =>
                  setEnabledMethods((current) => toggleOption(current, method, checked))
                }
              />
            ))}
          </SettingsGroup>
          <SettingsGroup
            description={t(`${translationPath}.settlement.networks.description`)}
            title={t(`${translationPath}.settlement.networks.title`)}
          >
            {merchantSettlementNetworks.map((network) => (
              <SettingSwitch
                checked={enabledNetworks.includes(network)}
                description={t(`${translationPath}.settlement.networks.help.${network}`)}
                disabled={isSaving}
                id={`${fieldId}-network-${network}`}
                key={network}
                label={t(`pages.account.sections.merchant.profile.settlement.networks.${network}`)}
                onCheckedChange={(checked) =>
                  setEnabledNetworks((current) => toggleOption(current, network, checked))
                }
              />
            ))}
          </SettingsGroup>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards aria-hidden="true" className="size-4 text-primary" />
            {t(`${translationPath}.finance.title`)}
          </CardTitle>
          <CardDescription>{t(`${translationPath}.finance.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
          <SettingField
            description={t(`${translationPath}.finance.minimumHelp`)}
            id={`${fieldId}-withdrawal-minimum`}
            label={t(`${translationPath}.finance.minimum`)}
            onChange={setWithdrawalMinimum}
            prefix="$"
            value={withdrawalMinimum}
          />
          <SettingField
            description={t(`${translationPath}.finance.withdrawalFeeHelp`)}
            id={`${fieldId}-withdrawal-fee-rate`}
            label={t(`${translationPath}.finance.withdrawalFee`)}
            onChange={setWithdrawalFeeRate}
            suffix="%"
            value={withdrawalFeeRate}
          />
          <SettingField
            description={t(`${translationPath}.finance.platformRateHelp`)}
            id={`${fieldId}-platform-rate`}
            label={t(`${translationPath}.finance.platformRate`)}
            onChange={setPlatformRate}
            suffix="%"
            value={platformRate}
          />
        </CardContent>
        <CardFooter className="justify-end border-t px-5 py-4 sm:px-6">
          <Button disabled={isSaving} type="submit">
            {isSaving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {t(`${translationPath}.save`)}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function SettingsGroup({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SettingSwitch({
  checked,
  description,
  disabled,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-secondary/25 p-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SettingField({
  description,
  id,
  label,
  onChange,
  prefix,
  suffix,
  value,
}: {
  description: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix === undefined ? null : (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          className={prefix === undefined ? 'pr-10' : 'pl-8 pr-10'}
          id={id}
          inputMode="decimal"
          onChange={(event) => onChange(normalizeDecimalInput(event.target.value))}
          value={value}
        />
        {suffix === undefined ? null : (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function normalizeDecimalInput(value: string): string {
  const sanitized = value.replace(/[^\d.]/g, '');
  const [rawInteger = '', ...fractionParts] = sanitized.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '').slice(0, 9);
  if (fractionParts.length === 0) return integer;
  return `${integer || '0'}.${fractionParts.join('').slice(0, 2)}`;
}

function validDecimal(value: string, allowZero: boolean): boolean {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0);
}

function validRate(value: string): boolean {
  return validDecimal(value, true) && Number(value) <= 100;
}

function toggleOption<T>(current: T[], option: T, enabled: boolean): T[] {
  if (enabled) return current.includes(option) ? current : [...current, option];
  return current.filter((value) => value !== option);
}
