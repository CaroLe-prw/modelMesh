import {
  CheckCircle2,
  FlaskConical,
  LoaderCircle,
  ShieldAlert,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  AdminCatalogReviewModelCheckStatus,
  AdminCatalogReviewModelTest,
} from '@/features/account/api/admin-catalog-reviews';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

type ModelTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { result: AdminCatalogReviewModelTest; status: 'success' }
  | { errorKey: string; status: 'error' };

const translationPath = 'pages.account.sections.admin.catalogReviews.reviewDialog.modelTest';

export function AdminModelVerificationPanel({
  disabled,
  onBusyChange,
  onTest,
  reviewId,
}: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onTest: () => Promise<AdminCatalogReviewModelTest>;
  reviewId: string;
}) {
  const { t } = useTranslation();
  const [test, setTest] = useState<ModelTestState>({ status: 'idle' });
  const isTesting = test.status === 'testing';

  useEffect(() => {
    setTest({ status: 'idle' });
    onBusyChange(false);
  }, [onBusyChange, reviewId]);

  async function handleTest() {
    setTest({ status: 'testing' });
    onBusyChange(true);
    try {
      const result = await onTest();
      setTest({ result, status: 'success' });
    } catch (error: unknown) {
      const errorKey =
        error instanceof ApiError &&
        error.code === API_ERROR_CODE.MERCHANT_CHANNEL_CREDENTIALS_REJECTED
          ? 'credentialsRejected'
          : error instanceof ApiError &&
              error.code === API_ERROR_CODE.CATALOG_REVIEW_MODEL_TEST_FAILED
            ? 'testFailed'
            : error instanceof ApiError && error.code === API_ERROR_CODE.CATALOG_REVIEW_NOT_FOUND
              ? 'notFound'
              : 'general';
      setTest({ errorKey, status: 'error' });
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <strong className="block text-sm">{t(`${translationPath}.title`)}</strong>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t(`${translationPath}.description`)}
          </p>
        </div>
        <Button
          className="shrink-0"
          disabled={disabled || isTesting}
          onClick={() => void handleTest()}
          type="button"
          variant="outline"
        >
          {isTesting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <FlaskConical aria-hidden="true" />
          )}
          {t(
            `${translationPath}.${isTesting ? 'testing' : test.status === 'idle' ? 'test' : 'retest'}`,
          )}
        </Button>
      </div>

      {test.status === 'success' ? <ModelVerificationResult result={test.result} /> : null}
      {test.status === 'error' ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t(`${translationPath}.failedTitle`)}</AlertTitle>
          <AlertDescription>{t(`${translationPath}.errors.${test.errorKey}`)}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function ModelVerificationResult({ result }: { result: AdminCatalogReviewModelTest }) {
  const { t } = useTranslation();
  const hasFailed =
    result.identityRisk === 'high' || result.checks.some((check) => check.status === 'failed');
  const hasWarning =
    result.identityRisk === 'medium' ||
    result.identityRisk === 'unverified' ||
    result.checks.some((check) => check.status === 'warning');
  const outcome = hasFailed ? 'failed' : hasWarning ? 'warning' : 'passed';
  const SummaryIcon = hasFailed ? ShieldAlert : hasWarning ? TriangleAlert : CheckCircle2;
  const observedModels = result.observedModels.length
    ? result.observedModels.join(', ')
    : t(`${translationPath}.notReported`);

  return (
    <div className="grid gap-3">
      <Alert variant={hasFailed ? 'destructive' : hasWarning ? 'default' : 'success'}>
        <SummaryIcon aria-hidden="true" />
        <AlertTitle>{t(`${translationPath}.outcomes.${outcome}.title`)}</AlertTitle>
        <AlertDescription>
          {t(`${translationPath}.outcomes.${outcome}.description`, {
            attempts: result.attempts,
            latency: result.averageLatencyMs,
            successes: result.successfulAttempts,
          })}
        </AlertDescription>
      </Alert>

      <div className="grid gap-2 sm:grid-cols-2">
        {result.checks.map((check) => (
          <div
            className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-secondary/25 px-3 py-2"
            key={check.key}
          >
            <span className="text-xs font-medium">
              {t(`${translationPath}.checks.${check.key}`)}
            </span>
            <CheckStatus status={check.status} />
          </div>
        ))}
      </div>

      <dl className="grid gap-3 rounded-lg bg-secondary/25 p-3 text-xs sm:grid-cols-2">
        <VerificationField
          label={t(`${translationPath}.claimedModel`)}
          value={result.claimedModel}
        />
        <VerificationField label={t(`${translationPath}.observedModel`)} value={observedModels} />
        <VerificationField
          label={t(`${translationPath}.identityRisk`)}
          value={t(`${translationPath}.risks.${result.identityRisk}`)}
        />
        <VerificationField
          label={t(`${translationPath}.endpointTrust`)}
          value={t(
            `${translationPath}.endpoint.${result.officialEndpoint ? 'official' : 'thirdParty'}`,
          )}
        />
        {result.systemFingerprints.length ? (
          <VerificationField
            className="sm:col-span-2"
            label={t(`${translationPath}.fingerprint`)}
            value={result.systemFingerprints.join(', ')}
          />
        ) : null}
      </dl>
    </div>
  );
}

function CheckStatus({ status }: { status: AdminCatalogReviewModelCheckStatus }) {
  const { t } = useTranslation();
  const Icon = status === 'passed' ? CheckCircle2 : status === 'warning' ? TriangleAlert : XCircle;
  const className =
    status === 'passed'
      ? 'border-success/25 bg-success/10 text-success'
      : status === 'warning'
        ? 'border-warning/25 bg-warning/10 text-warning'
        : 'border-destructive/25 bg-destructive/10 text-destructive';

  return (
    <Badge className={className} variant="outline">
      <Icon aria-hidden="true" className="size-3" />
      {t(`${translationPath}.statuses.${status}`)}
    </Badge>
  );
}

function VerificationField({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-foreground">{value}</dd>
    </div>
  );
}
