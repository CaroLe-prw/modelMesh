import {
  Landmark,
  LoaderCircle,
  Plus,
  QrCode,
  Star,
  Trash2,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
import type {
  MerchantSettlementAccount,
  MerchantSettlementAccountDraft,
  MerchantSettlementCurrency,
  MerchantSettlementMethod,
  MerchantSettlementNetwork,
} from '@/features/account/api/merchant-profile';
import type { MerchantSettlementSettings } from '@/features/account/api/system-settings';
import { fixedSettlementCurrency } from '@/features/account/components/merchant/merchant-settlement-form';

const settlementMethodIcons: Record<MerchantSettlementMethod, LucideIcon> = {
  alipay: QrCode,
  bank: Landmark,
  usdt: WalletCards,
};

export function MerchantSettlementAccounts({
  accounts,
  disabled,
  onCreate,
  onDelete,
  onSetDefault,
  settings,
}: {
  accounts: MerchantSettlementAccount[];
  disabled: boolean;
  onCreate: (draft: MerchantSettlementAccountDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  settings: MerchantSettlementSettings;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t('pages.account.sections.merchant.profile.settlement.accountCount', {
            count: accounts.length,
          })}
        </p>
        <CreateSettlementAccountDialog
          disabled={disabled}
          onCreate={onCreate}
          settings={settings}
        />
      </div>

      {settings.enabledMethods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {t('pages.account.sections.merchant.profile.settlement.noAvailableMethods')}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          {t('pages.account.sections.merchant.profile.settlement.empty')}
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((account) => (
            <SettlementAccountCard
              account={account}
              disabled={disabled}
              key={account.id}
              onDelete={() => onDelete(account.id)}
              onSetDefault={() => onSetDefault(account.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SettlementAccountCard({
  account,
  disabled,
  onDelete,
  onSetDefault,
}: {
  account: MerchantSettlementAccount;
  disabled: boolean;
  onDelete: () => Promise<void>;
  onSetDefault: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const Icon = settlementMethodIcons[account.method];

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{account.entityName}</strong>
            <Badge variant="outline">{account.currency}</Badge>
            {account.network ? (
              <Badge variant="outline">
                {t(
                  `pages.account.sections.merchant.profile.settlement.networks.${account.network}`,
                )}
              </Badge>
            ) : null}
            {account.isDefault ? (
              <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">
                {t('pages.account.sections.merchant.profile.settlement.default')}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(`pages.account.sections.merchant.profile.settlement.methods.${account.method}`)}
          </p>
          <p className="mt-1 break-all font-mono text-sm">{account.accountMasked}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            disabled={disabled || account.isDefault}
            onClick={() => void onSetDefault().catch(() => undefined)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Star aria-hidden="true" />
            {t('pages.account.sections.merchant.profile.settlement.setDefault')}
          </Button>
          <Button
            aria-label={t('pages.account.sections.merchant.profile.settlement.deleteLabel', {
              account: account.accountMasked,
            })}
            disabled={disabled || account.isDefault}
            onClick={() => void onDelete().catch(() => undefined)}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateSettlementAccountDialog({
  disabled,
  onCreate,
  settings,
}: {
  disabled: boolean;
  onCreate: (account: MerchantSettlementAccountDraft) => Promise<void>;
  settings: MerchantSettlementSettings;
}) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<MerchantSettlementCurrency>('CNY');
  const [method, setMethod] = useState<MerchantSettlementMethod>('bank');
  const [network, setNetwork] = useState<MerchantSettlementNetwork>('TRC20');
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const effectiveCurrency = fixedSettlementCurrency(method) ?? currency;

  function handleOpenChange(nextOpen: boolean) {
    if (disabled || isSaving) return;
    setOpen(nextOpen);
    if (nextOpen) {
      const firstMethod = settings.enabledMethods[0];
      if (!firstMethod) return;
      setCurrency(firstMethod === 'usdt' ? 'USDT' : 'CNY');
      setMethod(firstMethod);
      setNetwork(settings.enabledNetworks[0] ?? 'TRC20');
    }
  }

  function handleMethodChange(value: string) {
    const nextMethod = value as MerchantSettlementMethod;
    setMethod(nextMethod);
    setCurrency(nextMethod === 'usdt' ? 'USDT' : 'CNY');
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    try {
      await onCreate({
        account: String(formData.get('account') ?? '').trim(),
        currency: effectiveCurrency,
        entityName: String(formData.get('entityName') ?? '').trim(),
        method,
        ...(method === 'usdt' ? { network } : {}),
      });
      setOpen(false);
    } catch {
      // The parent displays the localized API error and keeps this dialog open for correction.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button
          className="w-full sm:w-auto"
          disabled={disabled || settings.enabledMethods.length === 0}
          type="button"
        >
          <Plus aria-hidden="true" />
          {t('pages.account.sections.merchant.profile.settlement.add')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        closeLabel={t('pages.account.sections.merchant.profile.settlement.dialog.close')}
      >
        <DialogHeader>
          <DialogTitle>
            {t('pages.account.sections.merchant.profile.settlement.dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.merchant.profile.settlement.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" key={open ? 'open' : 'closed'} onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="merchant-settlement-entity">
              {t(
                method === 'alipay'
                  ? 'pages.account.sections.merchant.profile.settlement.dialog.alipayName'
                  : 'pages.account.sections.merchant.profile.settlement.entity',
              )}
            </Label>
            <Input
              autoComplete={method === 'alipay' ? 'name' : 'organization'}
              disabled={isSaving}
              id="merchant-settlement-entity"
              key={`entity-${method}`}
              maxLength={method === 'alipay' ? 80 : 120}
              minLength={2}
              name="entityName"
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="merchant-settlement-method">
                {t('pages.account.sections.merchant.profile.settlement.method')}
              </Label>
              <Select disabled={isSaving} onValueChange={handleMethodChange} value={method}>
                <SelectTrigger className="w-full" id="merchant-settlement-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.enabledMethods.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`pages.account.sections.merchant.profile.settlement.methods.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="merchant-settlement-currency">
                {t('pages.account.sections.merchant.profile.settlement.currency')}
              </Label>
              {method === 'bank' ? (
                <Select
                  disabled={isSaving}
                  onValueChange={(value) => setCurrency(value as MerchantSettlementCurrency)}
                  value={currency}
                >
                  <SelectTrigger className="w-full" id="merchant-settlement-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  aria-readonly="true"
                  className="font-mono"
                  id="merchant-settlement-currency"
                  readOnly
                  value={effectiveCurrency}
                />
              )}
            </div>
          </div>
          {method === 'usdt' ? (
            <div className="grid gap-2">
              <Label htmlFor="merchant-settlement-network">
                {t('pages.account.sections.merchant.profile.settlement.network')}
              </Label>
              <Select
                disabled={isSaving}
                onValueChange={(value) => setNetwork(value as MerchantSettlementNetwork)}
                value={network}
              >
                <SelectTrigger className="w-full" id="merchant-settlement-network">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.enabledNetworks.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`pages.account.sections.merchant.profile.settlement.networks.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('pages.account.sections.merchant.profile.settlement.dialog.networkHint')}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="merchant-settlement-account">
              {t(
                method === 'alipay'
                  ? 'pages.account.sections.merchant.profile.settlement.dialog.alipayPhone'
                  : 'pages.account.sections.merchant.profile.settlement.account',
              )}
            </Label>
            <Input
              autoComplete={method === 'alipay' ? 'tel' : 'off'}
              disabled={isSaving}
              id="merchant-settlement-account"
              inputMode={method === 'bank' ? 'numeric' : method === 'alipay' ? 'tel' : 'text'}
              key={method}
              maxLength={method === 'usdt' ? 42 : method === 'bank' ? 35 : 32}
              minLength={method === 'bank' ? 12 : method === 'alipay' ? 7 : 4}
              name="account"
              type={method === 'alipay' ? 'tel' : 'text'}
              placeholder={t(
                `pages.account.sections.merchant.profile.settlement.dialog.accountPlaceholders.${method}`,
              )}
              required
            />
          </div>
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {t('pages.account.sections.merchant.profile.settlement.dialog.cancel')}
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {t('pages.account.sections.merchant.profile.settlement.dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
