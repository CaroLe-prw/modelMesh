import { useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { SiAlipay, SiTether, SiWechat } from 'react-icons/si';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { demoAccountSummary } from '@/features/account/account-demo-data';
import { useAuth } from '@/features/auth/context/auth-context';
import { cn } from '@/lib/utils';

const quickAmounts = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000] as const;

type PaymentMethodId = 'alipay' | 'wechat' | 'usdt';

interface PaymentMethod {
  icon: IconType;
  iconClassName: string;
  id: PaymentMethodId;
}

const paymentMethods: PaymentMethod[] = [
  { icon: SiAlipay, iconClassName: 'text-primary', id: 'alipay' },
  { icon: SiWechat, iconClassName: 'text-success', id: 'wechat' },
  { icon: SiTether, iconClassName: 'text-chart-4', id: 'usdt' },
];

export function BillingRechargePanel() {
  const { i18n, t } = useTranslation();
  const { state } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('alipay');
  const [showFeedback, setShowFeedback] = useState(false);
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const accountName =
    state.status === 'authenticated' ? state.user.email.split('@')[0] || state.user.email : '—';
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        style: 'currency',
      }),
    [i18n.resolvedLanguage],
  );

  function handleAmountChange(value: string) {
    setAmount(value);
    setShowFeedback(false);
  }

  return (
    <div className="grid gap-4">
      <Card className="gap-0 py-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            {t('pages.account.sections.billing.recharge.account')}
          </p>
          <strong className="mt-2 block text-xl">{accountName}</strong>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">
              {t('pages.account.sections.billing.recharge.balance')}
            </span>{' '}
            <strong className="font-mono text-base tabular-nums text-success">
              {currencyFormatter.format(demoAccountSummary.balance)}
            </strong>
          </p>
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <Label className="text-sm font-semibold" id="quick-amount-label">
            {t('pages.account.sections.billing.recharge.quickAmount')}
          </Label>
          <div
            aria-labelledby="quick-amount-label"
            className="mt-3 grid grid-cols-3 gap-2.5"
            role="group"
          >
            {quickAmounts.map((quickAmount) => {
              const isSelected = Number(amount) === quickAmount;

              return (
                <Button
                  aria-pressed={isSelected}
                  className={cn(
                    'h-12 font-mono text-sm tabular-nums sm:text-base',
                    isSelected && 'border-primary bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                  key={quickAmount}
                  onClick={() => handleAmountChange(String(quickAmount))}
                  type="button"
                  variant="outline"
                >
                  {quickAmount}
                </Button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2">
            <Label htmlFor="billing-custom-amount">
              {t('pages.account.sections.billing.recharge.customAmount')}
            </Label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-muted-foreground"
              >
                $
              </span>
              <Input
                className="h-11 pl-8 font-mono tabular-nums"
                id="billing-custom-amount"
                inputMode="decimal"
                min="0"
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder={t('pages.account.sections.billing.recharge.amountPlaceholder')}
                step="0.01"
                type="number"
                value={amount}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <Label className="text-sm font-semibold" id="payment-method-label">
            {t('pages.account.sections.billing.recharge.paymentMethod')}
          </Label>
          <div
            aria-labelledby="payment-method-label"
            className="mt-3 grid gap-2.5 sm:grid-cols-3"
            role="group"
          >
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;

              return (
                <Button
                  aria-pressed={isSelected}
                  className={cn(
                    'h-14 justify-center text-sm sm:text-base',
                    isSelected &&
                      'border-primary bg-primary/10 text-foreground hover:bg-primary/15',
                  )}
                  key={method.id}
                  onClick={() => {
                    setPaymentMethod(method.id);
                    setShowFeedback(false);
                  }}
                  type="button"
                  variant="outline"
                >
                  <Icon aria-hidden="true" className={cn('size-5', method.iconClassName)} />
                  {t(`pages.account.sections.billing.recharge.methods.${method.id}`)}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      <Button
        className="h-12 w-full text-base shadow-sm"
        disabled={!validAmount}
        onClick={() => setShowFeedback(true)}
        type="button"
      >
        {validAmount
          ? t('pages.account.sections.billing.recharge.confirmWithAmount', {
              amount: currencyFormatter.format(numericAmount),
            })
          : t('pages.account.sections.billing.recharge.confirm')}
      </Button>
      {showFeedback && (
        <p aria-live="polite" className="text-center text-xs text-muted-foreground">
          {t('pages.account.sections.billing.recharge.notConnected')}
        </p>
      )}
    </div>
  );
}
