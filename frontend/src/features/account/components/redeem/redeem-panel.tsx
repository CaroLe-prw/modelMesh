import { useMemo, useState, type SubmitEvent } from 'react';
import { CheckCircle2, CircleDollarSign, CreditCard, Gift, Info, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { demoAccountSummary } from '@/features/account/account-demo-data';
import { cn } from '@/lib/utils';

type ActivityType = 'balanceCredit' | 'balanceDebit' | 'concurrencyCredit';
type ActivityReason = 'adminAdjustment' | 'redemptionCode';

interface RedeemActivity {
  occurredAt: string;
  reason: ActivityReason;
  type: ActivityType;
  value: number;
}

const redeemActivities: RedeemActivity[] = [
  {
    occurredAt: '2026-08-05T07:30:10',
    reason: 'adminAdjustment',
    type: 'balanceCredit',
    value: 10_000,
  },
  {
    occurredAt: '2026-08-03T23:00:01',
    reason: 'adminAdjustment',
    type: 'balanceCredit',
    value: 21.72,
  },
  {
    occurredAt: '2026-08-03T22:56:28',
    reason: 'adminAdjustment',
    type: 'balanceCredit',
    value: 100,
  },
  {
    occurredAt: '2026-08-03T14:56:37',
    reason: 'adminAdjustment',
    type: 'balanceCredit',
    value: 20,
  },
  {
    occurredAt: '2026-08-03T09:33:11',
    reason: 'adminAdjustment',
    type: 'balanceDebit',
    value: -1.95,
  },
  {
    occurredAt: '2026-08-03T09:32:41',
    reason: 'adminAdjustment',
    type: 'balanceDebit',
    value: -612.77,
  },
  {
    occurredAt: '2026-08-02T09:11:12',
    reason: 'adminAdjustment',
    type: 'concurrencyCredit',
    value: 99_985,
  },
  {
    occurredAt: '2026-07-31T18:42:09',
    reason: 'redemptionCode',
    type: 'balanceCredit',
    value: 5,
  },
];

const activityPresentation = {
  balanceCredit: {
    icon: CircleDollarSign,
    iconClassName: 'bg-success/12 text-success',
    valueClassName: 'text-success',
  },
  balanceDebit: {
    icon: CircleDollarSign,
    iconClassName: 'bg-destructive/10 text-destructive',
    valueClassName: 'text-destructive',
  },
  concurrencyCredit: {
    icon: Zap,
    iconClassName: 'bg-primary/10 text-primary',
    valueClassName: 'text-primary',
  },
} as const;

const REDEEM_TOAST_ID = 'redeem-feedback';

export function RedeemPanel() {
  const { i18n, t } = useTranslation();
  const [code, setCode] = useState('');
  const canRedeem = code.trim().length > 0;
  const balanceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        style: 'currency',
      }),
    [i18n.resolvedLanguage],
  );
  const signedCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        signDisplay: 'always',
        style: 'currency',
      }),
    [i18n.resolvedLanguage],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
    [i18n.resolvedLanguage],
  );

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRedeem) {
      return;
    }

    toast.info(t('pages.account.sections.redeem.form.notConnected'), {
      id: REDEEM_TOAST_ID,
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 sm:gap-5">
      <Card className="gap-0 overflow-hidden border-primary/25 bg-primary py-0 text-primary-foreground shadow-[0_18px_45px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]">
        <div className="flex min-h-54 flex-col items-center justify-center px-5 py-8 text-center sm:min-h-62">
          <span className="grid size-14 place-items-center rounded-xl bg-white/16 sm:size-16">
            <CreditCard aria-hidden="true" className="size-7 sm:size-8" />
          </span>
          <p className="mt-4 text-sm font-medium text-primary-foreground/80">
            {t('pages.account.sections.redeem.summary.balance')}
          </p>
          <strong className="mt-2 font-mono text-3xl tracking-[-0.04em] tabular-nums sm:text-4xl">
            {balanceFormatter.format(demoAccountSummary.balance)}
          </strong>
          <p className="mt-2 text-sm text-primary-foreground/80">
            {t('pages.account.sections.redeem.summary.concurrency', {
              count: numberFormatter.format(demoAccountSummary.concurrency),
            })}
          </p>
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <form className="p-5 sm:p-6" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="redemption-code">{t('pages.account.sections.redeem.form.label')}</Label>
            <div className="relative">
              <Gift
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 z-1 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                autoComplete="off"
                className="h-11 pl-10 font-mono"
                id="redemption-code"
                maxLength={128}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('pages.account.sections.redeem.form.placeholder')}
                spellCheck={false}
                value={code}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pages.account.sections.redeem.form.hint')}
            </p>
          </div>
          <Button className="mt-5 h-11 w-full" disabled={!canRedeem} type="submit">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {t('pages.account.sections.redeem.form.submit')}
          </Button>
        </form>
      </Card>

      <Card className="gap-0 border-primary/25 bg-primary/5 py-0 shadow-none">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-5 sm:p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Info aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{t('pages.account.sections.redeem.about.title')}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
              <li>{t('pages.account.sections.redeem.about.singleUse')}</li>
              <li>{t('pages.account.sections.redeem.about.benefits')}</li>
              <li>{t('pages.account.sections.redeem.about.support')}</li>
              <li>{t('pages.account.sections.redeem.about.instant')}</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.redeem.activity.title')}</h2>
        </div>
        <div className="grid gap-2 p-3 sm:p-4">
          {redeemActivities.map((activity) => {
            const presentation = activityPresentation[activity.type];
            const Icon = presentation.icon;
            const isConcurrency = activity.type === 'concurrencyCredit';
            const value = isConcurrency
              ? t('pages.account.sections.redeem.activity.requests', {
                  count: numberFormatter.format(activity.value),
                })
              : signedCurrencyFormatter.format(activity.value);

            return (
              <div
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-lg bg-secondary/45 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4"
                key={`${activity.occurredAt}-${activity.type}`}
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-lg',
                    presentation.iconClassName,
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm sm:truncate">
                    {t('pages.account.sections.redeem.activity.entryTitle', {
                      reason: t(
                        `pages.account.sections.redeem.activity.reasons.${activity.reason}`,
                      ),
                      type: t(`pages.account.sections.redeem.activity.types.${activity.type}`),
                    })}
                  </strong>
                  <time
                    className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground"
                    dateTime={activity.occurredAt}
                  >
                    {dateTimeFormatter.format(new Date(activity.occurredAt))}
                  </time>
                </div>
                <div className="col-start-2 flex min-w-0 items-baseline justify-between gap-3 text-right sm:col-start-3 sm:row-start-1 sm:block sm:shrink-0">
                  <strong
                    className={cn(
                      'block truncate font-mono text-sm tabular-nums',
                      presentation.valueClassName,
                    )}
                  >
                    {value}
                  </strong>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`pages.account.sections.redeem.activity.reasons.${activity.reason}`)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
