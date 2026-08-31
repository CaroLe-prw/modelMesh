import { CircleDollarSign, Save, Settings2, WalletCards } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPriceSettingsCard } from '@/features/account/components/admin/admin-price-settings-card';

export function AdminSettingsPanel() {
  const { t } = useTranslation();
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [withdrawalMinimum, setWithdrawalMinimum] = useState('10.00');
  const [withdrawalFeeRate, setWithdrawalFeeRate] = useState('1.50');
  const [platformRate, setPlatformRate] = useState('8.00');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  return (
    <Tabs defaultValue="pricing">
      <div className="max-w-full overflow-x-auto pb-0.5">
        <TabsList className="h-auto w-max max-w-full gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="pricing"
          >
            <CircleDollarSign aria-hidden="true" />
            {t('pages.account.sections.admin.settings.tabs.pricing')}
          </TabsTrigger>
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="general"
          >
            <Settings2 aria-hidden="true" />
            {t('pages.account.sections.admin.settings.tabs.general')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pricing">
        <AdminPriceSettingsCard />
      </TabsContent>

      <TabsContent value="general">
        <div className="grid min-w-0 gap-4">
          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="border-b py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 aria-hidden="true" className="size-4 text-primary" />
                {t('pages.account.sections.admin.settings.registration.title')}
              </CardTitle>
              <CardDescription>
                {t('pages.account.sections.admin.settings.registration.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-6 rounded-lg border bg-secondary/25 p-4">
                <div className="min-w-0">
                  <Label htmlFor="registration-enabled">
                    {t('pages.account.sections.admin.settings.registration.label')}
                  </Label>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t('pages.account.sections.admin.settings.registration.help')}
                  </p>
                </div>
                <Switch
                  checked={registrationEnabled}
                  id="registration-enabled"
                  onCheckedChange={setRegistrationEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit}>
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="border-b py-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <WalletCards aria-hidden="true" className="size-4 text-primary" />
                  {t('pages.account.sections.admin.settings.finance.title')}
                </CardTitle>
                <CardDescription>
                  {t('pages.account.sections.admin.settings.finance.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                <SettingField
                  description={t('pages.account.sections.admin.settings.finance.minimumHelp')}
                  id="withdrawal-minimum"
                  label={t('pages.account.sections.admin.settings.finance.minimum')}
                  onChange={setWithdrawalMinimum}
                  prefix="$"
                  value={withdrawalMinimum}
                />
                <SettingField
                  description={t('pages.account.sections.admin.settings.finance.withdrawalFeeHelp')}
                  id="withdrawal-fee-rate"
                  label={t('pages.account.sections.admin.settings.finance.withdrawalFee')}
                  onChange={setWithdrawalFeeRate}
                  suffix="%"
                  value={withdrawalFeeRate}
                />
                <SettingField
                  description={t('pages.account.sections.admin.settings.finance.platformRateHelp')}
                  id="platform-rate"
                  label={t('pages.account.sections.admin.settings.finance.platformRate')}
                  onChange={setPlatformRate}
                  suffix="%"
                  value={platformRate}
                />
              </CardContent>
              <CardFooter className="justify-end border-t px-5 py-4 sm:px-6">
                <Button type="submit">
                  <Save aria-hidden="true" />
                  {t('pages.account.sections.admin.settings.save')}
                </Button>
              </CardFooter>
            </Card>
          </form>
          <p className="px-1 text-xs leading-5 text-muted-foreground">
            {t('pages.account.sections.admin.previewNotice')}
          </p>
        </div>
      </TabsContent>
    </Tabs>
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
