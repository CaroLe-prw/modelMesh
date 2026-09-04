import {
  AlertCircle,
  CircleCheckBig,
  Clock3,
  Landmark,
  LoaderCircle,
  RefreshCw,
  Send,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
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
  createMerchantWithdrawal,
  getMerchantWithdrawals,
  type MerchantWithdrawalBundle,
} from '@/features/account/api/merchant-withdrawals';
import {
  formatMerchantDate,
  formatUsd,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';

const withdrawalStats = [
  { icon: WalletCards, key: 'available', valueKey: 'availableBalanceUsd' },
  { icon: Clock3, key: 'processing', valueKey: 'processingAmountUsd' },
  { icon: CircleCheckBig, key: 'paid', valueKey: 'paidAmountUsd' },
] as const;

function withdrawalErrorKey(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'pages.account.sections.merchant.withdrawals.feedback.submitError';
  }
  switch (error.code) {
    case API_ERROR_CODE.INVALID_MERCHANT_WITHDRAWAL:
      return 'pages.account.sections.merchant.withdrawals.feedback.invalid';
    case API_ERROR_CODE.MERCHANT_WITHDRAWAL_BELOW_MINIMUM:
      return 'pages.account.sections.merchant.withdrawals.feedback.belowMinimum';
    case API_ERROR_CODE.MERCHANT_WITHDRAWAL_INSUFFICIENT_BALANCE:
      return 'pages.account.sections.merchant.withdrawals.feedback.insufficientBalance';
    case API_ERROR_CODE.MERCHANT_SETTLEMENT_ACCOUNT_NOT_FOUND:
      return 'pages.account.sections.merchant.withdrawals.feedback.accountNotFound';
    default:
      return 'pages.account.sections.merchant.withdrawals.feedback.submitError';
  }
}

export function MerchantWithdrawalsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [withdrawals, setWithdrawals] = useState<MerchantWithdrawalBundle | null>(null);
  const [amount, setAmount] = useState('');
  const [settlementAccountId, setSettlementAccountId] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    void getMerchantWithdrawals(controller.signal)
      .then((response) => {
        if (!active) return;
        setWithdrawals(response);
        setSettlementAccountId((current) => {
          if (response.settlementAccounts.some((account) => account.id === current)) return current;
          return (
            response.settlementAccounts.find((account) => account.isDefault)?.id ??
            response.settlementAccounts[0]?.id ??
            ''
          );
        });
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion, setGuest]);

  if (isLoading && withdrawals === null) {
    return (
      <Card className="grid min-h-52 place-items-center gap-2 p-6 text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        <span className="text-sm">{t('pages.account.sections.merchant.withdrawals.loading')}</span>
      </Card>
    );
  }

  if (loadError || withdrawals === null) {
    return (
      <Card className="grid min-h-52 place-items-center gap-3 p-6 text-center">
        <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {t('pages.account.sections.merchant.withdrawals.loadError')}
        </p>
        <Button onClick={() => setRefreshVersion((value) => value + 1)} variant="outline">
          <RefreshCw aria-hidden="true" />
          {t('pages.account.sections.merchant.withdrawals.retry')}
        </Button>
      </Card>
    );
  }

  const settlementAccount = withdrawals.settlementAccounts.find(
    (account) => account.id === settlementAccountId,
  );
  const availableWithdrawalBalance = Number(withdrawals.availableBalanceUsd);
  const minimumWithdrawal = Number(withdrawals.minimumWithdrawalUsd);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settlementAccountId || !amount) return;
    setIsSubmitting(true);
    try {
      const response = await createMerchantWithdrawal({
        amountUsd: amount,
        settlementAccountId,
      });
      setWithdrawals(response);
      setAmount('');
      toast.success(t('pages.account.sections.merchant.withdrawals.feedback.submitted'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(withdrawalErrorKey(error), {
          minimum: formatUsd(i18n.resolvedLanguage, minimumWithdrawal),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {withdrawalStats.map(({ icon: Icon, key, valueKey }) => (
          <Card className="gap-0 p-4 shadow-sm" key={key}>
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <strong className="mt-5 font-mono text-2xl tracking-[-0.04em]">
              {formatUsd(i18n.resolvedLanguage, Number(withdrawals[valueKey]))}
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
                  disabled={isSubmitting || withdrawals.settlementAccounts.length === 0}
                  id="merchant-withdrawal-amount"
                  inputMode="decimal"
                  max={withdrawals.availableBalanceUsd}
                  min={withdrawals.minimumWithdrawalUsd}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={t(
                    'pages.account.sections.merchant.withdrawals.form.amountPlaceholder',
                  )}
                  required
                  step="0.000001"
                  type="number"
                  value={amount}
                />
                <Button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  disabled={isSubmitting || availableWithdrawalBalance <= 0}
                  onClick={() => setAmount(withdrawals.availableBalanceUsd)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t('pages.account.sections.merchant.withdrawals.form.withdrawAll')}
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {t('pages.account.sections.merchant.withdrawals.form.minimum', {
                  amount: formatUsd(i18n.resolvedLanguage, minimumWithdrawal),
                })}
                {' · '}
                {t('pages.account.sections.merchant.withdrawals.form.fee', {
                  percent: withdrawals.withdrawalFeePercent,
                })}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="merchant-withdrawal-account">
                {t('pages.account.sections.merchant.withdrawals.form.account')}
              </Label>
              {withdrawals.settlementAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                  {t('pages.account.sections.merchant.withdrawals.form.noAccounts')}
                </div>
              ) : (
                <Select
                  disabled={isSubmitting}
                  onValueChange={setSettlementAccountId}
                  value={settlementAccountId}
                >
                  <SelectTrigger className="w-full" id="merchant-withdrawal-account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {withdrawals.settlementAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.entityName} · {account.currency} · {account.accountMasked}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {settlementAccount && (
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
                  {settlementAccount.network ? ` · ${settlementAccount.network}` : ''}
                </p>
                <p className="mt-1 break-all font-mono text-sm">
                  {settlementAccount.accountMasked}
                </p>
              </div>
            )}

            <Button
              className="w-full sm:w-auto sm:justify-self-end"
              disabled={isSubmitting || !settlementAccount || !amount}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Send aria-hidden="true" />
              )}
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
          {withdrawals.withdrawals.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t('pages.account.sections.merchant.withdrawals.history.empty')}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.withdrawals.map((withdrawal) => (
                <div
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                  key={withdrawal.id}
                >
                  <div className="min-w-0">
                    <strong className="block truncate font-mono text-xs">{withdrawal.id}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t(
                        `pages.account.sections.merchant.withdrawals.methods.${withdrawal.method}`,
                      )}{' '}
                      · {withdrawal.accountMasked} ·{' '}
                      {formatMerchantDate(i18n.resolvedLanguage, withdrawal.createdAt)}
                    </span>
                  </div>
                  <strong className="font-mono text-sm">
                    {formatUsd(i18n.resolvedLanguage, Number(withdrawal.amountUsd))}
                  </strong>
                  <MerchantStatusBadge namespace="withdrawals" status={withdrawal.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
