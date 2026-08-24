import {
  Ban,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ImageUp,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SubmitEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { showFormValidationToast } from '@/components/common/form-validation-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getMerchantApplication,
  submitMerchantApplication,
  type MerchantApplication,
  type MerchantApplicationStatus,
} from '@/features/account/api/merchant-application';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantAvatar } from '@/features/account/components/merchant-application/merchant-avatar';
import {
  canLoadMerchantAvatarSource,
  validateMerchantApplicationDraft,
  type MerchantApplicationField,
  type MerchantApplicationValidationCode,
  type MerchantApplicationValidationIssue,
} from '@/features/account/components/merchant-application/merchant-application-validation';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type ApplicationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; application: MerchantApplication | null };

type AvatarFileError = 'readFailed' | 'tooLarge' | 'unsupported';
type MerchantApplicationDisplayStatus = MerchantApplicationStatus | 'disabled';

const acceptedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxAvatarSize = 2 * 1024 * 1024;
const merchantApplicationValidationToastId = 'merchant-application-validation';
const avatarFileValidationCodes = {
  readFailed: 'avatarReadFailed',
  tooLarge: 'avatarTooLarge',
  unsupported: 'avatarUnsupported',
} as const satisfies Readonly<Record<AvatarFileError, MerchantApplicationValidationCode>>;
const statusStyles: Readonly<Record<MerchantApplicationDisplayStatus, string>> = {
  approved: 'border-success/25 bg-success/8 text-success',
  disabled: 'border-destructive/25 bg-destructive/8 text-destructive',
  pending: 'border-warning/25 bg-warning/8 text-warning',
  rejected: 'border-destructive/25 bg-destructive/8 text-destructive',
};
const statusIcons = {
  approved: CheckCircle2,
  disabled: Ban,
  pending: Clock3,
  rejected: CircleAlert,
} as const;

export function MerchantApplicationPanel() {
  const { i18n, t } = useTranslation();
  const [state, setState] = useState<ApplicationState>({ status: 'loading' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState<AvatarFileError>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [validationIssues, setValidationIssues] = useState<MerchantApplicationValidationIssue[]>(
    [],
  );
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadApplication = useCallback(() => {
    let isActive = true;
    setState({ status: 'loading' });

    void getMerchantApplication()
      .then((application) => {
        if (isActive) {
          setState({ status: 'ready', application });
          if (application) {
            setAvatarUrl(application.avatarUrl ?? '');
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(loadApplication, [loadApplication]);

  if (state.status === 'loading') {
    return (
      <Card className="min-h-64 items-center justify-center p-6 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('pages.account.sections.merchantApplication.loading')}
        </p>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card className="items-center p-6 text-center shadow-sm">
        <CircleAlert aria-hidden="true" className="size-8 text-destructive" />
        <div>
          <strong className="text-sm">
            {t('pages.account.sections.merchantApplication.loadError')}
          </strong>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.merchantApplication.loadErrorDescription')}
          </p>
        </div>
        <Button className="h-10" onClick={loadApplication} variant="outline">
          <RefreshCw aria-hidden="true" />
          {t('pages.account.sections.merchantApplication.retry')}
        </Button>
      </Card>
    );
  }

  const application = state.application;
  const showForm = application === null || application.status === 'rejected';
  const invalidFields = new Set(validationIssues.map((issue) => issue.field));

  function clearValidationIssue(field: MerchantApplicationField) {
    setValidationIssues((current) => current.filter((issue) => issue.field !== field));
  }

  function reportValidationIssues(issues: MerchantApplicationValidationIssue[]) {
    setValidationIssues(issues);
    setSubmitError(undefined);
    showFormValidationToast({
      description: t('pages.account.sections.merchantApplication.validation.description', {
        count: issues.length,
      }),
      id: merchantApplicationValidationToastId,
      issues: issues.map((issue) =>
        t(`pages.account.sections.merchantApplication.validation.issues.${issue.code}`),
      ),
      title: t('pages.account.sections.merchantApplication.validation.title'),
    });
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!acceptedAvatarTypes.has(file.type)) {
      setAvatarError('unsupported');
      event.target.value = '';
      return;
    }
    if (file.size > maxAvatarSize) {
      setAvatarError('tooLarge');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') {
        setAvatarError('readFailed');
        return;
      }
      setAvatarUrl(reader.result);
      setAvatarError(undefined);
      clearValidationIssue('avatar');
    });
    reader.addEventListener('error', () => setAvatarError('readFailed'));
    reader.readAsDataURL(file);
  }

  function clearAvatar() {
    setAvatarUrl('');
    setAvatarError(undefined);
    clearValidationIssue('avatar');
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const businessName = String(formData.get('businessName') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const website = String(formData.get('website') ?? '').trim();
    const normalizedAvatarUrl = avatarUrl.trim();
    const nextValidationIssues = validateMerchantApplicationDraft({
      avatarUrl: normalizedAvatarUrl,
      businessName,
      description,
      website,
    });

    if (avatarError && !nextValidationIssues.some((issue) => issue.field === 'avatar')) {
      nextValidationIssues.push({
        code: avatarFileValidationCodes[avatarError],
        field: 'avatar',
      });
    }

    if (nextValidationIssues.length > 0) {
      reportValidationIssues(nextValidationIssues);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);
    setValidationIssues([]);
    if (normalizedAvatarUrl && !(await canLoadMerchantAvatarSource(normalizedAvatarUrl))) {
      reportValidationIssues([{ code: 'avatarInvalid', field: 'avatar' }]);
      setIsSubmitting(false);
      return;
    }

    try {
      const submitted = await submitMerchantApplication({
        businessName,
        avatarUrl: normalizedAvatarUrl || undefined,
        description,
        website: website || undefined,
      });
      setState({ status: 'ready', application: submitted });
      toast.success(t('pages.account.sections.merchantApplication.feedback.submitted'));
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.code === API_ERROR_CODE.MERCHANT_APPLICATION_ALREADY_EXISTS
      ) {
        setSubmitError(t('pages.account.sections.merchantApplication.errors.alreadyExists'));
        return;
      }
      if (error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_MERCHANT_APPLICATION) {
        setSubmitError(t('pages.account.sections.merchantApplication.errors.invalid'));
        return;
      }
      setSubmitError(t('pages.account.sections.merchantApplication.errors.general'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)]">
      <div className="grid min-w-0 gap-4">
        {application ? (
          <ApplicationStatusCard application={application} language={i18n.resolvedLanguage} />
        ) : null}

        {showForm ? (
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <div className="border-b border-border p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 aria-hidden="true" className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {t('pages.account.sections.merchantApplication.form.title')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t('pages.account.sections.merchantApplication.form.description')}
                  </p>
                </div>
              </div>
            </div>

            <form className="grid gap-5 p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="merchant-business-name">
                    {t('pages.account.sections.merchantApplication.form.businessName')}
                  </Label>
                  <Input
                    aria-invalid={invalidFields.has('businessName') ? true : undefined}
                    className="h-10"
                    defaultValue={application?.businessName}
                    id="merchant-business-name"
                    maxLength={120}
                    minLength={2}
                    name="businessName"
                    onChange={() => clearValidationIssue('businessName')}
                    placeholder={t(
                      'pages.account.sections.merchantApplication.form.businessNamePlaceholder',
                    )}
                    required
                  />
                </div>

                <div className="grid gap-2 sm:row-span-2">
                  <Label htmlFor="merchant-avatar-url">
                    {t('pages.account.sections.merchantApplication.form.avatar')}
                    <span className="font-normal text-muted-foreground">
                      {t('pages.account.sections.merchantApplication.form.optional')}
                    </span>
                  </Label>
                  <div className="grid gap-3 rounded-xl border border-border bg-secondary/35 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <MerchantAvatar
                        alt={t('pages.account.sections.merchantApplication.form.avatarPreview')}
                        src={avatarUrl.trim() || undefined}
                      />
                      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                        <Input
                          accept="image/png,image/jpeg,image/webp"
                          aria-describedby="merchant-avatar-hint"
                          className="sr-only"
                          id="merchant-avatar-file"
                          onChange={handleAvatarFileChange}
                          ref={avatarInputRef}
                          type="file"
                        />
                        <Button asChild size="sm" variant="outline">
                          <Label className="cursor-pointer" htmlFor="merchant-avatar-file">
                            <ImageUp aria-hidden="true" />
                            {t('pages.account.sections.merchantApplication.form.avatarChoose')}
                          </Label>
                        </Button>
                        {avatarUrl ? (
                          <Button onClick={clearAvatar} size="sm" type="button" variant="ghost">
                            <Trash2 aria-hidden="true" />
                            {t('pages.account.sections.merchantApplication.form.avatarRemove')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Textarea
                      aria-describedby={`merchant-avatar-hint${avatarError ? ' merchant-avatar-error' : ''}`}
                      aria-invalid={avatarError || invalidFields.has('avatar') ? true : undefined}
                      className="min-h-20 resize-y break-all font-mono text-xs"
                      id="merchant-avatar-url"
                      maxLength={2_796_300}
                      onChange={(event) => {
                        setAvatarUrl(event.target.value);
                        setAvatarError(undefined);
                        clearValidationIssue('avatar');
                      }}
                      placeholder={t(
                        'pages.account.sections.merchantApplication.form.avatarPlaceholder',
                      )}
                      spellCheck={false}
                      value={avatarUrl}
                    />
                    <p
                      className="text-xs leading-5 text-muted-foreground"
                      id="merchant-avatar-hint"
                    >
                      {t('pages.account.sections.merchantApplication.form.avatarHint')}
                    </p>
                    {avatarError ? (
                      <p
                        className="text-xs text-destructive"
                        id="merchant-avatar-error"
                        role="alert"
                      >
                        {t(
                          `pages.account.sections.merchantApplication.form.avatarErrors.${avatarError}`,
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="merchant-website">
                  {t('pages.account.sections.merchantApplication.form.website')}
                  <span className="font-normal text-muted-foreground">
                    {t('pages.account.sections.merchantApplication.form.optional')}
                  </span>
                </Label>
                <Input
                  aria-invalid={invalidFields.has('website') ? true : undefined}
                  className="h-10"
                  defaultValue={application?.website ?? undefined}
                  id="merchant-website"
                  maxLength={255}
                  name="website"
                  onChange={() => clearValidationIssue('website')}
                  placeholder={t(
                    'pages.account.sections.merchantApplication.form.websitePlaceholder',
                  )}
                  type="url"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="merchant-description">
                  {t('pages.account.sections.merchantApplication.form.details')}
                </Label>
                <Textarea
                  aria-invalid={invalidFields.has('description') ? true : undefined}
                  className="min-h-36 resize-y"
                  defaultValue={application?.description}
                  id="merchant-description"
                  maxLength={2000}
                  minLength={20}
                  name="description"
                  onChange={() => clearValidationIssue('description')}
                  placeholder={t(
                    'pages.account.sections.merchantApplication.form.detailsPlaceholder',
                  )}
                  required
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {t('pages.account.sections.merchantApplication.form.detailsHint')}
                </p>
              </div>

              {submitError ? (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>
                    {t('pages.account.sections.merchantApplication.errors.title')}
                  </AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  {t('pages.account.sections.merchantApplication.form.submitHint')}
                </p>
                <Button className="h-10 w-full sm:w-auto" disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  {isSubmitting
                    ? t('pages.account.sections.merchantApplication.form.submitting')
                    : t('pages.account.sections.merchantApplication.form.submit')}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}
      </div>

      <ApplicationGuide />
    </div>
  );
}

function ApplicationStatusCard({
  application,
  language,
}: {
  application: MerchantApplication;
  language: string | undefined;
}) {
  const { t } = useTranslation();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const displayStatus: MerchantApplicationDisplayStatus =
    application.status === 'approved' && application.merchantAccessStatus === 'disabled'
      ? 'disabled'
      : application.status;
  const StatusIcon = statusIcons[displayStatus];

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [application.avatarUrl]);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-lg',
              displayStatus === 'approved' && 'bg-success/10 text-success',
              displayStatus === 'pending' && 'bg-warning/10 text-warning',
              (displayStatus === 'rejected' || displayStatus === 'disabled') &&
                'bg-destructive/10 text-destructive',
            )}
          >
            <StatusIcon aria-hidden="true" className="size-4.5" />
          </span>
          <div>
            <h2 className="font-semibold">
              {t('pages.account.sections.merchantApplication.status.title')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t(`pages.account.sections.merchantApplication.status.descriptions.${displayStatus}`)}
            </p>
          </div>
        </div>
        <Badge className={statusStyles[displayStatus]} variant="outline">
          <StatusIcon aria-hidden="true" />
          {t(`pages.account.sections.merchantApplication.statuses.${displayStatus}`)}
        </Badge>
      </div>

      {application.status === 'rejected' && application.reviewNote ? (
        <div className="border-b border-border p-5 sm:p-6">
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>
              {t('pages.account.sections.merchantApplication.status.reviewNote')}
            </AlertTitle>
            <AlertDescription>{application.reviewNote}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <dl className="grid gap-px bg-border sm:grid-cols-2">
        <ApplicationDetail
          label={t('pages.account.sections.merchantApplication.summary.businessName')}
          value={application.businessName}
        />
        <ApplicationDetail
          label={t('pages.account.sections.merchantApplication.summary.avatar')}
          value={
            <div className="flex min-w-0 items-center gap-3">
              <MerchantAvatar
                alt={t('pages.account.sections.merchantApplication.summary.avatarAlt', {
                  name: application.businessName,
                })}
                className="size-10 rounded-lg"
                onLoadError={() => setAvatarLoadFailed(true)}
                src={application.avatarUrl}
              />
              {avatarLoadFailed ? (
                <span className="text-xs leading-5 text-warning" role="status">
                  {t('pages.account.sections.merchantApplication.summary.avatarUnavailable')}
                </span>
              ) : null}
            </div>
          }
        />
        <ApplicationDetail
          label={t('pages.account.sections.merchantApplication.summary.applicationId')}
          value={application.applicationCode}
          mono
        />
        <ApplicationDetail
          label={t('pages.account.sections.merchantApplication.summary.submittedAt')}
          value={formatMerchantDate(language, application.createdAt)}
          mono
        />
      </dl>
    </Card>
  );
}

function ApplicationDetail({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 bg-card p-4 sm:px-6">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn('mt-1.5 min-w-0 text-sm font-medium', mono && 'truncate font-mono text-xs')}
      >
        {value}
      </dd>
    </div>
  );
}

function ApplicationGuide() {
  const { t } = useTranslation();
  const steps = [
    { icon: Store, key: 'submit' },
    { icon: ShieldCheck, key: 'review' },
    { icon: CheckCircle2, key: 'activate' },
  ] as const;

  return (
    <Card className="gap-0 self-start overflow-hidden py-0 shadow-sm xl:sticky xl:top-6">
      <div className="border-b border-border p-5">
        <h2 className="font-semibold">
          {t('pages.account.sections.merchantApplication.guide.title')}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t('pages.account.sections.merchantApplication.guide.description')}
        </p>
      </div>
      <ol className="grid gap-0 divide-y divide-border">
        {steps.map(({ icon: Icon, key }, index) => (
          <li className="flex gap-3 p-5" key={key}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div>
              <strong className="text-sm">
                {t(`pages.account.sections.merchantApplication.guide.steps.${key}.title`, {
                  number: index + 1,
                })}
              </strong>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t(`pages.account.sections.merchantApplication.guide.steps.${key}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
