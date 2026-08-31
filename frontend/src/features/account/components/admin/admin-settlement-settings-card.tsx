import { AlertCircle, LoaderCircle, RefreshCw, Save, WalletCards } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type {
  MerchantSettlementMethod,
  MerchantSettlementNetwork,
} from '@/features/account/api/merchant-profile';
import {
  getAdminMerchantSettlementSettings,
  merchantSettlementMethods,
  merchantSettlementNetworks,
  updateAdminMerchantSettlementSettings,
} from '@/features/account/api/settlement-settings';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

const translationPath = 'pages.account.sections.admin.settings.settlement';

export function AdminSettlementSettingsCard() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const fieldId = useId();
  const [enabledMethods, setEnabledMethods] = useState<MerchantSettlementMethod[]>([]);
  const [enabledNetworks, setEnabledNetworks] = useState<MerchantSettlementNetwork[]>([]);
  const [loadVersion, setLoadVersion] = useState(0);
  const [loadState, setLoadState] = useState<'error' | 'loading' | 'ready'>('loading');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoadState('loading');
    void getAdminMerchantSettlementSettings(controller.signal)
      .then((settings) => {
        if (!active) return;
        setEnabledMethods(settings.enabledMethods);
        setEnabledNetworks(settings.enabledNetworks);
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

  function toggleMethod(method: MerchantSettlementMethod, enabled: boolean) {
    setEnabledMethods((current) => toggleOption(current, method, enabled));
  }

  function toggleNetwork(network: MerchantSettlementNetwork, enabled: boolean) {
    setEnabledNetworks((current) => toggleOption(current, network, enabled));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enabledMethods.includes('usdt') && enabledNetworks.length === 0) {
      toast.error(t(`${translationPath}.feedback.networkRequired`));
      return;
    }

    setIsSaving(true);
    try {
      const settings = await updateAdminMerchantSettlementSettings({
        enabledMethods,
        enabledNetworks,
      });
      setEnabledMethods(settings.enabledMethods);
      setEnabledNetworks(settings.enabledNetworks);
      toast.success(t(`${translationPath}.feedback.saved`));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          error instanceof ApiError &&
            error.code === API_ERROR_CODE.INVALID_MERCHANT_SETTLEMENT_SETTINGS
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
          <WalletCards aria-hidden="true" className="size-4 text-primary" />
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
                type="button"
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
          <CardContent className="grid gap-6 p-5 sm:p-6">
            {loadState === 'loading' ? (
              <div
                aria-live="polite"
                className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {t(`${translationPath}.loading`)}
              </div>
            ) : (
              <>
                <SettingsGroup
                  description={t(`${translationPath}.methods.description`)}
                  title={t(`${translationPath}.methods.title`)}
                >
                  {merchantSettlementMethods.map((method) => (
                    <SettingSwitch
                      checked={enabledMethods.includes(method)}
                      description={t(`${translationPath}.methods.help.${method}`)}
                      disabled={isSaving}
                      id={`${fieldId}-method-${method}`}
                      key={method}
                      label={t(
                        `pages.account.sections.merchant.profile.settlement.methods.${method}`,
                      )}
                      onCheckedChange={(checked) => toggleMethod(method, checked)}
                    />
                  ))}
                </SettingsGroup>

                <SettingsGroup
                  description={t(`${translationPath}.networks.description`)}
                  title={t(`${translationPath}.networks.title`)}
                >
                  {merchantSettlementNetworks.map((network) => (
                    <SettingSwitch
                      checked={enabledNetworks.includes(network)}
                      description={t(`${translationPath}.networks.help.${network}`)}
                      disabled={isSaving}
                      id={`${fieldId}-network-${network}`}
                      key={network}
                      label={t(
                        `pages.account.sections.merchant.profile.settlement.networks.${network}`,
                      )}
                      onCheckedChange={(checked) => toggleNetwork(network, checked)}
                    />
                  ))}
                </SettingsGroup>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t px-5 py-4 sm:px-6">
            <Button disabled={isSaving || loadState !== 'ready'} type="submit">
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

function toggleOption<T>(current: T[], option: T, enabled: boolean): T[] {
  if (enabled) return current.includes(option) ? current : [...current, option];
  return current.filter((value) => value !== option);
}
