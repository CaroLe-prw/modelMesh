import { CircleCheckBig, Clock3, Landmark, Send, WalletCards } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  formatMerchantDate,
  formatUsd,
  merchantSettlementAccounts,
  merchantWithdrawals,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

const availableWithdrawalBalance = 4_826.72;

const withdrawalStats = [
  { icon: WalletCards, key: 'available', value: availableWithdrawalBalance },
  { icon: Clock3, key: 'processing', value: 1_280 },
  { icon: CircleCheckBig, key: 'paid', value: 12_460.5 },
] as const;

export function MerchantWithdrawalsPanel() {
  const { i18n, t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [settlementAccountId, setSettlementAccountId] = useState(
    merchantSettlementAccounts.find((account) => account.isDefault)?.id ??
      merchantSettlementAccounts[0].id,
  );
  const settlementAccount =
    merchantSettlementAccounts.find((account) => account.id === settlementAccountId) ??
    merchantSettlementAccounts[0];

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(t('pages.account.sections.merchant.previewAction'));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {withdrawalStats.map(({ icon: Icon, key, value }) => (
          <Card className="gap-0 p-4 shadow-sm" key={key}>
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <strong className="mt-5 font-mono text-2xl tracking-[-0.04em]">
              {formatUsd(i18n.resolvedLanguage, value)}
            </strong>
            <span className="mt-1 text-xs text-muted-foreground">
              {t(`pages.account.sections.merchant.withdrawals.stats.${key}`)}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="gap-0 py-0 shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">
              {t('pages.account.sections.merchant.withdrawals.form.title')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('pages.account.sections.merchant.withdrawals.form.description')}
            </p>
          </div>
          <form className="grid gap-5 p-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="merchant-withdrawal-amount">
                {t('pages.account.sections.merchant.withdrawals.form.amount')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  className="pl-7 pr-18 font-mono tabular-nums"
                  id="merchant-withdrawal-amount"
                  inputMode="decimal"
                  max={availableWithdrawalBalance}
                  min="10"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={t(
                    'pages.account.sections.merchant.withdrawals.form.amountPlaceholder',
                  )}
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
                <Button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  onClick={() => setAmount(availableWithdrawalBalance.toFixed(2))}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t('pages.account.sections.merchant.withdrawals.form.withdrawAll')}
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {t('pages.account.sections.merchant.withdrawals.form.minimum')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="merchant-withdrawal-account">
                {t('pages.account.sections.merchant.withdrawals.form.account')}
              </Label>
              <Select onValueChange={setSettlementAccountId} value={settlementAccountId}>
                <SelectTrigger className="w-full" id="merchant-withdrawal-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {merchantSettlementAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.entity} · {account.currency} · {account.account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Landmark aria-hidden="true" className="size-4 text-primary" />
                {t('pages.account.sections.merchant.withdrawals.form.destination')}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  `pages.account.sections.merchant.withdrawals.methods.${settlementAccount.method}`,
                )}{' '}
                · {settlementAccount.currency}
              </p>
              <p className="mt-1 break-all font-mono text-sm">{settlementAccount.account}</p>
            </div>

            <Button className="w-full sm:w-auto sm:justify-self-end" type="submit">
              <Send aria-hidden="true" />
              {t('pages.account.sections.merchant.withdrawals.form.submit')}
            </Button>
          </form>
        </Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">
              {t('pages.account.sections.merchant.withdrawals.history.title')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('pages.account.sections.merchant.withdrawals.history.description')}
            </p>
          </div>
          <div className="divide-y divide-border">
            {merchantWithdrawals.map((withdrawal) => (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                key={withdrawal.id}
              >
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-xs">{withdrawal.id}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(`pages.account.sections.merchant.withdrawals.methods.${withdrawal.method}`)}{' '}
                    · {formatMerchantDate(i18n.resolvedLanguage, withdrawal.createdAt)}
                  </span>
                </div>
                <strong className="font-mono text-sm">
                  {formatUsd(i18n.resolvedLanguage, withdrawal.amount)}
                </strong>
                <MerchantStatusBadge namespace="withdrawals" status={withdrawal.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}
