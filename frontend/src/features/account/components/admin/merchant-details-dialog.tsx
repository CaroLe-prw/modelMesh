import { ExternalLink, Gauge, PackagePlus, RadioTower, ScrollText, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminMerchant } from '@/features/account/api/admin-merchants';
import { adminMerchantResourceUrl } from '@/features/account/components/admin/admin-merchant-resource-navigation';
import { formatMicrousd } from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { MerchantAvatar } from '@/features/account/components/merchant-application/merchant-avatar';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { cn } from '@/lib/utils';

export function MerchantDetailsDialog({
  merchant,
  onOpenChange,
  open,
}: {
  merchant: AdminMerchant | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { i18n, t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.merchants.detailsDialog';
  const application = merchant?.application;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Store aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`${translationPath}.description`, { merchant: merchant?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {merchant ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/25 p-4 sm:flex-row sm:items-center">
              <MerchantAvatar
                alt={t(`${translationPath}.avatarAlt`, { merchant: merchant.name })}
                className="size-16"
                src={application?.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-lg">{merchant.name}</strong>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {merchant.email}
                </span>
              </div>
              <AdminStatusBadge namespace="merchants" status={merchant.status} />
            </div>

            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="border-b border-border bg-secondary/35 px-4 py-3 text-sm font-semibold">
                {t(`${translationPath}.accountSection`)}
              </h3>
              <dl className="grid gap-px bg-border sm:grid-cols-2">
                <MerchantDetail
                  label={t(`${translationPath}.merchantId`)}
                  mono
                  value={merchant.id}
                />
                <MerchantDetail
                  label={t(`${translationPath}.createdAt`)}
                  value={formatMerchantDate(i18n.resolvedLanguage, merchant.createdAt)}
                />
                <MerchantDetail
                  label={t(`${translationPath}.balance`)}
                  mono
                  value={formatMicrousd(i18n.resolvedLanguage, merchant.balanceMicrousd)}
                />
                <MerchantDetail
                  label={t(`${translationPath}.concurrencyLimit`)}
                  mono
                  value={formatRequestLimit(
                    merchant.concurrencyLimit,
                    t(`${translationPath}.unlimited`),
                    t('pages.account.sections.admin.merchants.statisticsUnavailable'),
                  )}
                />
                <MerchantDetail
                  label={t(`${translationPath}.rpmLimit`)}
                  mono
                  value={formatRequestLimit(
                    merchant.rpmLimit,
                    t(`${translationPath}.unlimited`),
                    t('pages.account.sections.admin.merchants.statisticsUnavailable'),
                  )}
                />
                <MerchantDetail
                  label={t(`${translationPath}.channelsAndModels`)}
                  value={t(`${translationPath}.statistics`, {
                    channels:
                      merchant.channelCount ??
                      t('pages.account.sections.admin.merchants.statisticsUnavailable'),
                    models:
                      merchant.modelCount ??
                      t('pages.account.sections.admin.merchants.statisticsUnavailable'),
                  })}
                />
              </dl>
              <p className="flex items-center gap-2 border-t border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
                <Gauge aria-hidden="true" className="size-4 text-primary" />
                {t(`${translationPath}.limitsHint`)}
              </p>
            </section>

            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="border-b border-border bg-secondary/35 px-4 py-3 text-sm font-semibold">
                {t(`${translationPath}.quickActionsSection`)}
              </h3>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <Button asChild className="justify-start" variant="outline">
                  <Link
                    onClick={() => onOpenChange(false)}
                    to={adminMerchantResourceUrl(merchant.id, 'channels')}
                  >
                    <RadioTower aria-hidden="true" />
                    {t(`${translationPath}.channels`)}
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline">
                  <Link
                    onClick={() => onOpenChange(false)}
                    to={adminMerchantResourceUrl(merchant.id, 'models')}
                  >
                    <PackagePlus aria-hidden="true" />
                    {t(`${translationPath}.models`)}
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline">
                  <Link
                    onClick={() => onOpenChange(false)}
                    to={adminMerchantResourceUrl(merchant.id, 'modelLogs')}
                  >
                    <ScrollText aria-hidden="true" />
                    {t(`${translationPath}.usageLogs`)}
                  </Link>
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="border-b border-border bg-secondary/35 px-4 py-3 text-sm font-semibold">
                {t(`${translationPath}.applicationSection`)}
              </h3>
              {application ? (
                <dl className="grid gap-px bg-border sm:grid-cols-2">
                  <MerchantDetail
                    label={t(`${translationPath}.applicationCode`)}
                    mono
                    value={application.applicationCode}
                  />
                  <MerchantDetail
                    label={t(`${translationPath}.submittedAt`)}
                    value={formatMerchantDate(i18n.resolvedLanguage, application.submittedAt)}
                  />
                  <MerchantDetail
                    label={t(`${translationPath}.updatedAt`)}
                    value={formatMerchantDate(i18n.resolvedLanguage, application.updatedAt)}
                  />
                  <MerchantDetail
                    label={t(`${translationPath}.website`)}
                    value={
                      application.website ? (
                        <a
                          className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
                          href={application.website}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="truncate">{application.website}</span>
                          <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                        </a>
                      ) : (
                        t(`${translationPath}.notProvided`)
                      )
                    }
                  />
                  <MerchantDetail
                    className="sm:col-span-2"
                    label={t(`${translationPath}.businessDescription`)}
                    value={application.description}
                    valueClassName="whitespace-pre-wrap break-words font-normal leading-6"
                  />
                </dl>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  {t(`${translationPath}.applicationUnavailable`)}
                </p>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function formatRequestLimit(
  value: number | null | undefined,
  unlimited: string,
  unavailable: string,
): string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return unavailable;
  }

  return value === 0 ? unlimited : value.toLocaleString();
}

function MerchantDetail({
  className,
  label,
  mono = false,
  value,
  valueClassName,
}: {
  className?: string;
  label: string;
  mono?: boolean;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className={cn('min-w-0 bg-card p-4', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-1.5 min-w-0 text-sm font-medium',
          mono && 'font-mono text-xs',
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
