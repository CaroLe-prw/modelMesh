import { ExternalLink, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  AdminMerchant,
  AdminMerchantReviewDecision,
} from '@/features/account/api/admin-merchants';
import { MerchantAvatar } from '@/features/account/components/merchant-application/merchant-avatar';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { cn } from '@/lib/utils';

const MAX_REVIEW_NOTE_LENGTH = 1_000;

export function ReviewMerchantDialog({
  merchant,
  onOpenChange,
  onSubmit,
  open,
}: {
  merchant: AdminMerchant | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    merchant: AdminMerchant,
    decision: AdminMerchantReviewDecision,
    reviewNote: string,
  ) => Promise<void>;
  open: boolean;
}) {
  const { i18n, t } = useTranslation();
  const noteId = useId();
  const [reviewNote, setReviewNote] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translationPath = 'pages.account.sections.admin.merchants.reviewDialog';

  useEffect(() => {
    if (open) {
      setReviewNote('');
      setAvatarLoadFailed(false);
    }
  }, [merchant, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) onOpenChange(nextOpen);
  }

  async function handleReview(decision: AdminMerchantReviewDecision) {
    if (!merchant) return;
    setIsSubmitting(true);
    try {
      await onSubmit(merchant, decision, reviewNote.trim());
      onOpenChange(false);
    } catch {
      // The parent shows the localized API error and keeps the dialog open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`${translationPath}.description`, { merchant: merchant?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        {merchant?.application ? (
          <div className="grid gap-4 rounded-xl border border-border bg-secondary/25 p-4">
            <div className="flex items-center gap-4">
              <MerchantAvatar
                alt={t(`${translationPath}.avatarAlt`, { merchant: merchant.name })}
                className="size-14"
                onLoadError={() => setAvatarLoadFailed(true)}
                src={merchant.application.avatarUrl}
              />
              <div className="min-w-0">
                <strong className="block truncate text-base leading-tight">{merchant.name}</strong>
                <span className="mt-1.5 block truncate text-sm text-muted-foreground">
                  {merchant.email}
                </span>
              </div>
            </div>
            {avatarLoadFailed ? (
              <p className="text-xs leading-5 text-warning" role="status">
                {t(`${translationPath}.avatarUnavailable`)}
              </p>
            ) : null}
            <dl className="grid gap-3 sm:grid-cols-2">
              <ReviewDetail
                label={t(`${translationPath}.applicationCode`)}
                mono
                value={merchant.application.applicationCode}
              />
              <ReviewDetail
                label={t(`${translationPath}.submittedAt`)}
                value={formatMerchantDate(i18n.resolvedLanguage, merchant.application.submittedAt)}
              />
              <ReviewDetail
                className="sm:col-span-2"
                label={t(`${translationPath}.website`)}
                value={
                  merchant.application.website ? (
                    <a
                      className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
                      href={merchant.application.website}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="truncate">{merchant.application.website}</span>
                      <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                    </a>
                  ) : (
                    t(`${translationPath}.notProvided`)
                  )
                }
              />
              <ReviewDetail
                className="sm:col-span-2"
                label={t(`${translationPath}.businessDescription`)}
                value={merchant.application.description}
                valueClassName="whitespace-pre-wrap break-words font-normal leading-6"
              />
            </dl>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t(`${translationPath}.detailsUnavailable`)}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor={noteId}>{t(`${translationPath}.note`)}</Label>
          <Textarea
            id={noteId}
            maxLength={MAX_REVIEW_NOTE_LENGTH}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={t(`${translationPath}.notePlaceholder`)}
            rows={5}
            value={reviewNote}
          />
          <p className="text-xs text-muted-foreground">
            {t(`${translationPath}.noteHint`, {
              count: reviewNote.length,
              max: MAX_REVIEW_NOTE_LENGTH,
            })}
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => void handleReview('rejected')}
            type="button"
            variant="destructive"
          >
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {t(`${translationPath}.reject`)}
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => void handleReview('approved')}
            type="button"
          >
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {t(`${translationPath}.approve`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDetail({
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
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(mono ? 'mt-1 font-mono text-xs' : 'mt-1 text-sm font-medium', valueClassName)}
      >
        {value}
      </dd>
    </div>
  );
}
