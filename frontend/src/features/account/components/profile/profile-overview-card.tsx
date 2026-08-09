import { Link2, LoaderCircle, LogOut } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/common/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { demoAccountSummary } from '@/features/account/account-demo-data';

interface ProfileOverviewCardProps {
  avatarUrl?: string;
  displayName: string;
  email: string;
  isLoggingOut: boolean;
  onLogout: () => void;
  userId: number;
}

export function ProfileOverviewCard({
  avatarUrl,
  displayName,
  email,
  isLoggingOut,
  onLogout,
  userId,
}: ProfileOverviewCardProps) {
  const { i18n, t } = useTranslation();
  const balanceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        style: 'currency',
      }),
    [i18n.resolvedLanguage],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  return (
    <Card className="gap-0 overflow-hidden border-primary/15 py-0 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <UserAvatar
            avatarUrl={avatarUrl}
            className="size-18 border-3 border-background shadow-md"
            fallbackClassName="text-lg"
            name={displayName}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold">{displayName}</h2>
              <Badge className="border-primary/20 bg-primary/8 text-primary" variant="outline">
                {t('pages.account.sections.profile.summary.plan')}
              </Badge>
              <Badge className="border-success/20 bg-success/10 text-success" variant="outline">
                {t('pages.account.sections.profile.summary.enabled')}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
              <Link2 aria-hidden="true" className="size-3" />
              {t('pages.account.sections.profile.summary.emailSource')}
            </span>
          </div>

          <Button
            className="self-start"
            disabled={isLoggingOut}
            onClick={onLogout}
            type="button"
            variant="outline"
          >
            {isLoggingOut ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <LogOut aria-hidden="true" className="size-4" />
            )}
            {t('pages.account.logout')}
          </Button>
        </div>

        <dl className="mt-6 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-secondary/45 p-4">
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.profile.summary.balance')}
            </dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums">
              {balanceFormatter.format(demoAccountSummary.balance)}
            </dd>
          </div>
          <div className="rounded-lg bg-secondary/45 p-4">
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.profile.summary.concurrency')}
            </dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums">
              {numberFormatter.format(demoAccountSummary.concurrency)}
            </dd>
          </div>
          <div className="rounded-lg bg-secondary/45 p-4">
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.profile.summary.accountId')}
            </dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums">#{userId}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
