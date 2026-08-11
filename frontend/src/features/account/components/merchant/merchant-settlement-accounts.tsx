import { Landmark, Plus, Star, Trash2, WalletCards } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import {
  merchantSettlementAccounts,
  type MerchantSettlementAccount,
  type MerchantSettlementCurrency,
  type MerchantSettlementMethod,
} from '@/features/account/components/merchant/merchant-demo-data';

export function MerchantSettlementAccounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState(merchantSettlementAccounts);

  function addAccount(account: Omit<MerchantSettlementAccount, 'id' | 'isDefault'>) {
    setAccounts((current) => [
      ...current,
      {
        ...account,
        id: `settlement-preview-${crypto.randomUUID()}`,
        isDefault: current.length === 0,
      },
    ]);
    toast.success(t('pages.account.sections.merchant.profile.settlement.feedback.added'));
  }

  function setDefaultAccount(accountId: string) {
    setAccounts((current) =>
      current.map((account) => ({ ...account, isDefault: account.id === accountId })),
    );
    toast.success(t('pages.account.sections.merchant.profile.settlement.feedback.defaultUpdated'));
  }

  function deleteAccount(accountId: string) {
    setAccounts((current) => current.filter((account) => account.id !== accountId));
    toast.success(t('pages.account.sections.merchant.profile.settlement.feedback.deleted'));
  }

  return (
    <div className="grid gap-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t('pages.account.sections.merchant.profile.settlement.accountCount', {
            count: accounts.length,
          })}
        </p>
        <CreateSettlementAccountDialog onCreate={addAccount} />
      </div>

      <div className="grid gap-3">
        {accounts.map((account) => (
          <SettlementAccountCard
            account={account}
            key={account.id}
            onDelete={() => deleteAccount(account.id)}
            onSetDefault={() => setDefaultAccount(account.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SettlementAccountCard({
  account,
  onDelete,
  onSetDefault,
}: {
  account: MerchantSettlementAccount;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const { t } = useTranslation();
  const Icon = account.method === 'bank' ? Landmark : WalletCards;

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{account.entity}</strong>
            <Badge variant="outline">{account.currency}</Badge>
            {account.isDefault ? (
              <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">
                {t('pages.account.sections.merchant.profile.settlement.default')}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(`pages.account.sections.merchant.profile.settlement.methods.${account.method}`)}
          </p>
          <p className="mt-1 break-all font-mono text-sm">{account.account}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            disabled={account.isDefault}
            onClick={onSetDefault}
            size="sm"
            type="button"
            variant="outline"
          >
            <Star aria-hidden="true" />
            {t('pages.account.sections.merchant.profile.settlement.setDefault')}
          </Button>
          <Button
            aria-label={t('pages.account.sections.merchant.profile.settlement.deleteLabel', {
              account: account.account,
            })}
            disabled={account.isDefault}
            onClick={onDelete}
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
  onCreate,
}: {
  onCreate: (account: Omit<MerchantSettlementAccount, 'id' | 'isDefault'>) => void;
}) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<MerchantSettlementCurrency>('USD');
  const [method, setMethod] = useState<MerchantSettlementMethod>('bank');
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setCurrency('USD');
      setMethod('bank');
    }
  }

  function handleMethodChange(value: string) {
    const nextMethod = value as MerchantSettlementMethod;
    setMethod(nextMethod);
    setCurrency(nextMethod === 'bank' ? 'USD' : 'USDT');
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onCreate({
      account: String(formData.get('account') ?? '').trim(),
      currency,
      entity: String(formData.get('entity') ?? '').trim(),
      method,
    });
    setOpen(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" type="button">
          <Plus aria-hidden="true" />
          {t('pages.account.sections.merchant.profile.settlement.add')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
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
              {t('pages.account.sections.merchant.profile.settlement.entity')}
            </Label>
            <Input id="merchant-settlement-entity" name="entity" required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="merchant-settlement-method">
                {t('pages.account.sections.merchant.profile.settlement.method')}
              </Label>
              <Select onValueChange={handleMethodChange} value={method}>
                <SelectTrigger className="w-full" id="merchant-settlement-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">
                    {t('pages.account.sections.merchant.profile.settlement.methods.bank')}
                  </SelectItem>
                  <SelectItem value="usdt">
                    {t('pages.account.sections.merchant.profile.settlement.methods.usdt')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="merchant-settlement-currency">
                {t('pages.account.sections.merchant.profile.settlement.currency')}
              </Label>
              <Select
                onValueChange={(value) => setCurrency(value as MerchantSettlementCurrency)}
                value={currency}
              >
                <SelectTrigger className="w-full" id="merchant-settlement-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="merchant-settlement-account">
              {t('pages.account.sections.merchant.profile.settlement.account')}
            </Label>
            <Input
              id="merchant-settlement-account"
              name="account"
              placeholder={t(
                'pages.account.sections.merchant.profile.settlement.dialog.accountPlaceholder',
              )}
              required
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t('pages.account.sections.merchant.profile.settlement.dialog.cancel')}
            </Button>
            <Button type="submit">
              {t('pages.account.sections.merchant.profile.settlement.dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
