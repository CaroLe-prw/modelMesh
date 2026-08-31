import {
  Cable,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  LoaderCircle,
  Pencil,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  AdminCatalogReview,
  AdminCatalogReviewConnectionTest,
  AdminCatalogReviewDecision,
  AdminCatalogReviewModelTest,
} from '@/features/account/api/admin-catalog-reviews';
import { AdminModelVerificationPanel } from '@/features/account/components/admin/admin-model-verification-panel';
import {
  formatMerchantDate,
  formatUsd,
} from '@/features/account/components/merchant/merchant-demo-data';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

const MAX_REVIEW_NOTE_LENGTH = 1_000;

type ConnectionTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { result: AdminCatalogReviewConnectionTest; status: 'success' }
  | { errorKey: string; status: 'error' };

export function ReviewCatalogDialog({
  isSubmitting,
  onOpenChange,
  onSubmit,
  onTestConnection,
  onTestModel,
  review,
}: {
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    review: AdminCatalogReview,
    decision: AdminCatalogReviewDecision,
    reviewNote: string,
  ) => Promise<void>;
  onTestConnection: (review: AdminCatalogReview) => Promise<AdminCatalogReviewConnectionTest>;
  onTestModel: (review: AdminCatalogReview) => Promise<AdminCatalogReviewModelTest>;
  review: AdminCatalogReview | null;
}) {
  const { i18n, t } = useTranslation();
  const noteId = useId();
  const [reviewNote, setReviewNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({ status: 'idle' });
  const [modelTesting, setModelTesting] = useState(false);
  const [isEditingDecision, setIsEditingDecision] = useState(false);
  const [decisionToConfirm, setDecisionToConfirm] = useState<AdminCatalogReviewDecision | null>(
    null,
  );
  const translationPath = 'pages.account.sections.admin.catalogReviews.reviewDialog';
  const isCompleted = review !== null && review.status !== 'pending';
  const isEditable = !isCompleted || isEditingDecision;
  const isTesting = connectionTest.status === 'testing';
  const isBusy = isSubmitting || isTesting || modelTesting;
  const HeaderIcon = isCompleted ? (isEditingDecision ? Pencil : Eye) : ClipboardCheck;
  const titleGroup = isCompleted ? (isEditingDecision ? 'editTitles' : 'detailTitles') : 'titles';
  const descriptionKey = isCompleted
    ? isEditingDecision
      ? 'editDescription'
      : 'detailDescription'
    : 'description';

  useEffect(() => {
    setReviewNote(review?.reviewNote ?? '');
    setNoteError(null);
    setConnectionTest({ status: 'idle' });
    setModelTesting(false);
    setIsEditingDecision(false);
    setDecisionToConfirm(null);
  }, [review?.id, review?.reviewNote]);

  function handleOpenChange(open: boolean) {
    if (!isBusy) onOpenChange(open);
  }

  async function handleReview(decision: AdminCatalogReviewDecision) {
    if (!review || !isEditable) return;
    const note = reviewNote.trim();
    if (decision === 'rejected' && !note) {
      setNoteError(t(`${translationPath}.noteRequired`));
      return;
    }
    setNoteError(null);
    setReviewNote(note);
    setDecisionToConfirm(decision);
  }

  async function confirmReview() {
    if (!review || !decisionToConfirm) return;
    try {
      await onSubmit(review, decisionToConfirm, reviewNote);
    } finally {
      setDecisionToConfirm(null);
    }
  }

  async function handleTestConnection() {
    if (!review || review.kind !== 'channel') return;
    setConnectionTest({ status: 'testing' });
    try {
      const result = await onTestConnection(review);
      setConnectionTest({ result, status: 'success' });
    } catch (error: unknown) {
      const errorKey =
        error instanceof ApiError &&
        error.code === API_ERROR_CODE.MERCHANT_CHANNEL_CREDENTIALS_REJECTED
          ? 'credentialsRejected'
          : error instanceof ApiError &&
              error.code === API_ERROR_CODE.MERCHANT_CHANNEL_CONNECTION_FAILED
            ? 'connectionFailed'
            : error instanceof ApiError && error.code === API_ERROR_CODE.CATALOG_REVIEW_NOT_FOUND
              ? 'notFound'
              : 'general';
      setConnectionTest({ errorKey, status: 'error' });
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={review !== null}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <HeaderIcon aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>
            {t(`${translationPath}.${titleGroup}.${review?.kind ?? 'channel'}`)}
          </DialogTitle>
          <DialogDescription>
            {t(`${translationPath}.${descriptionKey}`, {
              name: review?.name ?? '',
            })}
          </DialogDescription>
        </DialogHeader>

        {review ? (
          <dl className="grid gap-4 rounded-xl border border-border bg-secondary/25 p-4 sm:grid-cols-2">
            <ReviewField label={t(`${translationPath}.subject`)} value={review.name} />
            <ReviewField label={t(`${translationPath}.channelId`)} value={review.channelId} />
            <ReviewField label={t(`${translationPath}.merchant`)} value={review.merchant} />
            <ReviewField label={t(`${translationPath}.provider`)} value={review.provider} />
            <ReviewField
              label={t(`${translationPath}.change`)}
              value={t(`pages.account.sections.admin.catalogReviews.actions.${review.action}`)}
            />
            <ReviewField
              label={t(`${translationPath}.status`)}
              value={t(`pages.account.sections.admin.catalogReviews.statuses.${review.status}`)}
            />
            <ReviewField
              label={t(`${translationPath}.submittedAt`)}
              value={formatMerchantDate(i18n.resolvedLanguage, review.submittedAt)}
            />
            {review.kind === 'model' && review.modelIdentifier ? (
              <ReviewField
                label={t(`${translationPath}.modelIdentifier`)}
                value={review.modelIdentifier}
              />
            ) : null}
            {review.kind === 'model' && review.contextWindow !== null ? (
              <ReviewField
                label={t(`${translationPath}.contextWindow`)}
                value={new Intl.NumberFormat(i18n.resolvedLanguage).format(review.contextWindow)}
              />
            ) : null}
            {review.kind === 'model' &&
            review.action !== 'priceChange' &&
            review.outputPrice !== null ? (
              <ReviewField
                label={t(`${translationPath}.outputPrice`)}
                value={formatUsd(i18n.resolvedLanguage, review.outputPrice)}
              />
            ) : null}
            {review.kind === 'model' &&
            review.action === 'priceChange' &&
            review.currentOutputPrice !== null ? (
              <ReviewField
                label={t(`${translationPath}.currentOutputPrice`)}
                value={formatUsd(i18n.resolvedLanguage, review.currentOutputPrice)}
              />
            ) : null}
            {review.kind === 'model' &&
            review.action === 'priceChange' &&
            review.proposedOutputPrice !== null ? (
              <ReviewField
                label={t(`${translationPath}.proposedOutputPrice`)}
                value={formatUsd(i18n.resolvedLanguage, review.proposedOutputPrice)}
              />
            ) : null}
            {review.kind === 'model' && review.priceEffectiveAt ? (
              <ReviewField
                label={t(`${translationPath}.priceEffectiveAt`)}
                value={formatMerchantDate(i18n.resolvedLanguage, review.priceEffectiveAt)}
              />
            ) : null}
          </dl>
        ) : null}

        {review?.kind === 'channel' ? (
          <div className="grid gap-3 rounded-xl border border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <strong className="block text-sm">
                  {t(`${translationPath}.connection.title`)}
                </strong>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t(`${translationPath}.connection.description`)}
                </p>
              </div>
              <Button
                className="shrink-0"
                disabled={isBusy}
                onClick={() => void handleTestConnection()}
                type="button"
                variant="outline"
              >
                {isTesting ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Cable aria-hidden="true" />
                )}
                {t(
                  `${translationPath}.connection.${isTesting ? 'testing' : connectionTest.status === 'idle' ? 'test' : 'retest'}`,
                )}
              </Button>
            </div>
            {connectionTest.status === 'success' ? (
              <Alert variant="success">
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>{t(`${translationPath}.connection.successTitle`)}</AlertTitle>
                <AlertDescription>
                  {t(`${translationPath}.connection.successDescription`, {
                    latency: connectionTest.result.latencyMs,
                    models: connectionTest.result.modelCount,
                  })}
                </AlertDescription>
              </Alert>
            ) : null}
            {connectionTest.status === 'error' ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>{t(`${translationPath}.connection.failedTitle`)}</AlertTitle>
                <AlertDescription>
                  {t(`${translationPath}.connection.errors.${connectionTest.errorKey}`)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {review?.kind === 'model' ? (
          <AdminModelVerificationPanel
            disabled={isSubmitting || isTesting}
            onBusyChange={setModelTesting}
            onTest={() => onTestModel(review)}
            reviewId={review.id}
          />
        ) : null}

        {!isEditable ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t(`${translationPath}.note`)}</p>
            <div className="min-h-20 whitespace-pre-wrap rounded-lg border border-border bg-secondary/25 p-3 text-sm leading-6">
              {review?.reviewNote || t(`${translationPath}.noNote`)}
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor={noteId}>{t(`${translationPath}.note`)}</Label>
            <Textarea
              aria-describedby={`${noteId}-hint${noteError ? ` ${noteId}-error` : ''}`}
              aria-invalid={noteError ? true : undefined}
              id={noteId}
              maxLength={MAX_REVIEW_NOTE_LENGTH}
              onChange={(event) => {
                setReviewNote(event.target.value);
                if (noteError && event.target.value.trim()) setNoteError(null);
              }}
              placeholder={t(`${translationPath}.notePlaceholder`)}
              rows={4}
              value={reviewNote}
            />
            <div className="flex flex-col gap-1 text-xs sm:flex-row sm:justify-between">
              <p className="text-muted-foreground" id={`${noteId}-hint`}>
                {t(`${translationPath}.noteHint`)}
              </p>
              <p className="shrink-0 text-muted-foreground">
                {t(`${translationPath}.noteCount`, {
                  count: reviewNote.length,
                  max: MAX_REVIEW_NOTE_LENGTH,
                })}
              </p>
            </div>
            {noteError ? (
              <p className="text-xs text-destructive" id={`${noteId}-error`} role="alert">
                {noteError}
              </p>
            ) : null}
          </div>
        )}

        {isCompleted && !isEditingDecision ? (
          <DialogFooter>
            <Button
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t('common.close')}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => {
                setReviewNote(review?.reviewNote ?? '');
                setNoteError(null);
                setIsEditingDecision(true);
              }}
              type="button"
            >
              <Pencil aria-hidden="true" />
              {t(`${translationPath}.edit`)}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            {isEditingDecision ? (
              <Button
                disabled={isBusy}
                onClick={() => {
                  setReviewNote(review?.reviewNote ?? '');
                  setNoteError(null);
                  setIsEditingDecision(false);
                }}
                type="button"
                variant="outline"
              >
                {t(`${translationPath}.cancel`)}
              </Button>
            ) : null}
            <Button
              disabled={isBusy}
              onClick={() => void handleReview('rejected')}
              type="button"
              variant="destructive"
            >
              {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {t(`${translationPath}.reject`)}
            </Button>
            <Button disabled={isBusy} onClick={() => void handleReview('approved')} type="button">
              {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {t(`${translationPath}.approve`)}
            </Button>
          </DialogFooter>
        )}

        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !isSubmitting) setDecisionToConfirm(null);
          }}
          open={decisionToConfirm !== null}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(`${translationPath}.confirmation.${decisionToConfirm ?? 'approved'}.title`)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(`${translationPath}.confirmation.description`, {
                  current: review
                    ? t(`pages.account.sections.admin.catalogReviews.statuses.${review.status}`)
                    : '',
                  name: review?.name ?? '',
                  next: decisionToConfirm
                    ? t(`pages.account.sections.admin.catalogReviews.statuses.${decisionToConfirm}`)
                    : '',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                {t(`${translationPath}.cancel`)}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmitting}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmReview();
                }}
                variant={decisionToConfirm === 'rejected' ? 'destructive' : 'default'}
              >
                {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                {t(`${translationPath}.confirmation.${decisionToConfirm ?? 'approved'}.confirm`)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function ReviewField({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
