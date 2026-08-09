import { Check, CircleDollarSign, Copy, Info, Percent, UserPlus, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/context/auth-context';
import { cn } from '@/lib/utils';

type CopyTarget = 'code' | 'link';

const referralStats = [
  {
    detailKey: 'rateDetail',
    icon: Percent,
    iconClassName: 'bg-success/12 text-success',
    key: 'rate',
    value: '5%',
    valueClassName: 'text-success',
  },
  {
    icon: UsersRound,
    iconClassName: 'bg-primary/10 text-primary',
    key: 'invited',
    value: '0',
  },
  {
    icon: CircleDollarSign,
    iconClassName: 'bg-success/12 text-success',
    key: 'available',
    value: '$0.00',
    valueClassName: 'text-success',
  },
  {
    icon: CircleDollarSign,
    iconClassName: 'bg-secondary text-muted-foreground',
    key: 'historical',
    value: '$0.00',
  },
] as const;

const COPY_TOAST_ID = 'referral-copy-feedback';

export function ReferralsPanel() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>();
  const referralCode = useMemo(() => {
    if (state.status !== 'authenticated') {
      return 'MM000000';
    }

    return `MM${state.user.id.toString(36).toUpperCase().padStart(6, '0')}`;
  }, [state]);
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  async function handleCopy(target: CopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      toast.success(t(`pages.account.sections.referrals.invitation.copySuccess.${target}`), {
        id: COPY_TOAST_ID,
      });
    } catch {
      toast.error(t('pages.account.sections.referrals.invitation.copyError'), {
        id: COPY_TOAST_ID,
      });
    }
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {referralStats.map((item) => {
          const Icon = item.icon;

          return (
            <Card className="gap-0 py-0 shadow-sm" key={item.key}>
              <CardContent className="flex min-h-28 items-center gap-4 p-4">
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-lg',
                    item.iconClassName,
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">
                    {t(`pages.account.sections.referrals.stats.${item.key}`)}
                  </span>
                  <strong
                    className={cn(
                      'mt-1 block font-mono text-xl tabular-nums tracking-tight',
                      'valueClassName' in item ? item.valueClassName : undefined,
                    )}
                  >
                    {item.value}
                  </strong>
                  {'detailKey' in item && (
                    <small className="mt-1 block text-xs leading-4 text-muted-foreground">
                      {t(`pages.account.sections.referrals.stats.${item.detailKey}`)}
                    </small>
                  )}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="font-semibold">
            {t('pages.account.sections.referrals.invitation.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.referrals.invitation.description')}
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <CopyField
              copied={copiedTarget === 'code'}
              id="referral-code"
              label={t('pages.account.sections.referrals.invitation.code')}
              onCopy={() => void handleCopy('code', referralCode)}
              value={referralCode}
            />
            <CopyField
              copied={copiedTarget === 'link'}
              id="referral-link"
              label={t('pages.account.sections.referrals.invitation.link')}
              onCopy={() => void handleCopy('link', referralLink)}
              value={referralLink}
            />
          </div>

          <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Info aria-hidden="true" className="size-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">
                {t('pages.account.sections.referrals.invitation.instructions.title')}
              </h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                <li>{t('pages.account.sections.referrals.invitation.instructions.share')}</li>
                <li>{t('pages.account.sections.referrals.invitation.instructions.reward')}</li>
                <li>{t('pages.account.sections.referrals.invitation.instructions.transfer')}</li>
              </ol>
            </div>
          </div>
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">
              {t('pages.account.sections.referrals.transfer.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('pages.account.sections.referrals.transfer.description')}
            </p>
            <p className="mt-3 text-xs font-medium text-warning">
              {t('pages.account.sections.referrals.transfer.unavailable')}
            </p>
          </div>
          <Button className="sm:self-start" disabled type="button">
            <CircleDollarSign aria-hidden="true" className="size-4" />
            {t('pages.account.sections.referrals.transfer.action')}
          </Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.referrals.users.title')}</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border px-5 py-8 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <UserPlus aria-hidden="true" className="size-5" />
              </span>
              <strong className="mt-3 block text-sm">
                {t('pages.account.sections.referrals.users.emptyTitle')}
              </strong>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('pages.account.sections.referrals.users.emptyDescription')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface CopyFieldProps {
  copied: boolean;
  id: string;
  label: string;
  onCopy: () => void;
  value: string;
}

function CopyField({ copied, id, label, onCopy, value }: CopyFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input className="h-11 pr-26 font-mono text-xs" id={id} readOnly value={value} />
        <Button
          aria-label={t('pages.account.sections.referrals.invitation.copy', { label })}
          className={cn('absolute right-1.5 top-1/2 -translate-y-1/2', copied && 'text-success')}
          onClick={onCopy}
          size="sm"
          title={t('pages.account.sections.referrals.invitation.copy', { label })}
          type="button"
          variant="ghost"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
          {t('pages.account.sections.referrals.invitation.copyAction')}
        </Button>
      </div>
    </div>
  );
}
