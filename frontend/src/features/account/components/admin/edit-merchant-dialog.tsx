import { LoaderCircle, Store } from 'lucide-react';
import { useEffect, useId, useState, type SubmitEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminMerchant, AdminMerchantUpdate } from '@/features/account/api/admin-merchants';
import { isEmailInputValid } from '@/lib/input-validation';

const MAX_NAME_LENGTH = 120;
const MIN_NAME_LENGTH = 2;
const MAX_REQUEST_LIMIT = 4_294_967_295;

export function EditMerchantDialog({
  merchant,
  onOpenChange,
  onSubmit,
  open,
}: {
  merchant: AdminMerchant | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (merchant: AdminMerchant, update: AdminMerchantUpdate) => Promise<void>;
  open: boolean;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [concurrencyLimit, setConcurrencyLimit] = useState('0');
  const [concurrencyLimitInvalid, setConcurrencyLimitInvalid] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [rpmLimit, setRpmLimit] = useState('0');
  const [rpmLimitInvalid, setRpmLimitInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translationPath = 'pages.account.sections.admin.merchants.editDialog';

  useEffect(() => {
    if (!open || !merchant) return;
    setName(merchant.name);
    setEmail(merchant.email);
    setConcurrencyLimit(String(merchant.concurrencyLimit ?? 0));
    setRpmLimit(String(merchant.rpmLimit ?? 0));
    setNameInvalid(false);
    setEmailInvalid(false);
    setConcurrencyLimitInvalid(false);
    setRpmLimitInvalid(false);
  }, [merchant, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchant) return;
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const parsedConcurrencyLimit = requestLimitInputToNumber(concurrencyLimit);
    const parsedRpmLimit = requestLimitInputToNumber(rpmLimit);
    const nextNameInvalid =
      normalizedName.length < MIN_NAME_LENGTH || normalizedName.length > MAX_NAME_LENGTH;
    const nextEmailInvalid = !isEmailInputValid(normalizedEmail);

    setNameInvalid(nextNameInvalid);
    setEmailInvalid(nextEmailInvalid);
    setConcurrencyLimitInvalid(parsedConcurrencyLimit === null);
    setRpmLimitInvalid(parsedRpmLimit === null);
    if (
      nextNameInvalid ||
      nextEmailInvalid ||
      parsedConcurrencyLimit === null ||
      parsedRpmLimit === null
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(merchant, {
        concurrencyLimit: parsedConcurrencyLimit,
        email: normalizedEmail,
        name: normalizedName,
        rpmLimit: parsedRpmLimit,
      });
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
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Store aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription>{t(`${translationPath}.description`)}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`${fieldId}-name`}>{t(`${translationPath}.name`)}</Label>
            <Input
              aria-describedby={nameInvalid ? `${fieldId}-name-error` : undefined}
              aria-invalid={nameInvalid || undefined}
              id={`${fieldId}-name`}
              maxLength={MAX_NAME_LENGTH}
              name="name"
              onChange={(event) => {
                setName(event.target.value);
                setNameInvalid(false);
              }}
              value={name}
            />
            {nameInvalid && (
              <p className="text-xs text-destructive" id={`${fieldId}-name-error`} role="alert">
                {t(`${translationPath}.nameError`)}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${fieldId}-email`}>{t(`${translationPath}.email`)}</Label>
            <Input
              aria-describedby={emailInvalid ? `${fieldId}-email-error` : undefined}
              aria-invalid={emailInvalid || undefined}
              autoComplete="email"
              id={`${fieldId}-email`}
              name="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailInvalid(false);
              }}
              type="email"
              value={email}
            />
            {emailInvalid && (
              <p className="text-xs text-destructive" id={`${fieldId}-email-error`} role="alert">
                {t(`${translationPath}.emailError`)}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RequestLimitField
              fieldId={`${fieldId}-concurrency-limit`}
              hint={t(
                `${translationPath}.${concurrencyLimitInvalid ? 'limitError' : 'concurrencyHint'}`,
              )}
              invalid={concurrencyLimitInvalid}
              label={t(`${translationPath}.concurrencyLimit`)}
              onChange={(value) => {
                setConcurrencyLimit(value);
                setConcurrencyLimitInvalid(false);
              }}
              value={concurrencyLimit}
            />
            <RequestLimitField
              fieldId={`${fieldId}-rpm-limit`}
              hint={t(`${translationPath}.${rpmLimitInvalid ? 'limitError' : 'rpmHint'}`)}
              invalid={rpmLimitInvalid}
              label={t(`${translationPath}.rpmLimit`)}
              onChange={(value) => {
                setRpmLimit(value);
                setRpmLimitInvalid(false);
              }}
              value={rpmLimit}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(`${translationPath}.${isSubmitting ? 'saving' : 'save'}`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestLimitField({
  fieldId,
  hint,
  invalid,
  label,
  onChange,
  value,
}: {
  fieldId: string;
  hint: string;
  invalid: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        aria-describedby={`${fieldId}-${invalid ? 'error' : 'hint'}`}
        aria-invalid={invalid || undefined}
        className="font-mono"
        id={fieldId}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <p
        className={invalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        id={`${fieldId}-${invalid ? 'error' : 'hint'}`}
      >
        {hint}
      </p>
    </div>
  );
}

function requestLimitInputToNumber(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed <= MAX_REQUEST_LIMIT ? parsed : null;
}
