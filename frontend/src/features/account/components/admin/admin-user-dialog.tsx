import { Check, Clipboard, LoaderCircle, RefreshCw, UserCog, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  type AdminUser,
  type AdminUserCreate,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUserUpdate,
} from '@/features/account/api/admin-users';
import { usdInputToMicrousd } from '@/features/account/components/admin/admin-money';

const roles: AdminUserRole[] = ['personal', 'merchant', 'admin'];
const statuses: AdminUserStatus[] = ['active', 'disabled'];
const MAX_USER_REQUEST_LIMIT = 4_294_967_295;
const MAX_USERNAME_LENGTH = 64;
const MAX_NOTES_LENGTH = 1_000;

export type AdminUserDialogTarget =
  { kind: 'create' } | { currentUserId: number | null; kind: 'edit'; user: AdminUser };

export type AdminUserDialogSubmission =
  { kind: 'create'; value: AdminUserCreate } | { kind: 'edit'; value: AdminUserUpdate };

export function AdminUserDialog({
  onOpenChange,
  onSubmit,
  open,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: AdminUserDialogSubmission) => Promise<void>;
  open: boolean;
  target: AdminUserDialogTarget | null;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [email, setEmail] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameInvalid, setUsernameInvalid] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesInvalid, setNotesInvalid] = useState(false);
  const [role, setRole] = useState<AdminUserRole>('personal');
  const [status, setStatus] = useState<AdminUserStatus>('active');
  const [balance, setBalance] = useState('0');
  const [balanceInvalid, setBalanceInvalid] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState('1');
  const [concurrencyLimitInvalid, setConcurrencyLimitInvalid] = useState(false);
  const [rpmLimit, setRpmLimit] = useState('0');
  const [rpmLimitInvalid, setRpmLimitInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCreate = target?.kind === 'create';
  const translationPath = `pages.account.sections.admin.users.${isCreate ? 'createDialog' : 'editDialog'}`;
  const isCurrentUser = target?.kind === 'edit' && target.user.id === target.currentUserId;

  useEffect(() => {
    if (!open || !target) return;
    const user = target.kind === 'edit' ? target.user : null;

    setEmail(user?.email ?? '');
    setEmailInvalid(false);
    setPassword('');
    setPasswordCopied(false);
    setPasswordInvalid(false);
    setUsername(user?.username ?? '');
    setUsernameInvalid(false);
    setNotes(user?.notes ?? '');
    setNotesInvalid(false);
    setRole(user?.role ?? 'personal');
    setStatus(user?.status ?? 'active');
    setBalance('0');
    setBalanceInvalid(false);
    setConcurrencyLimit(String(user?.concurrencyLimit ?? 1));
    setConcurrencyLimitInvalid(false);
    setRpmLimit(String(user?.rpmLimit ?? 0));
    setRpmLimitInvalid(false);
  }, [open, target]);

  useEffect(() => {
    if (!passwordCopied) return;
    const timer = window.setTimeout(() => setPasswordCopied(false), 2_000);
    return () => window.clearTimeout(timer);
  }, [passwordCopied]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;

    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim();
    const normalizedNotes = notes.trim();
    const nextEmailInvalid = !isEmailInputValid(normalizedEmail);
    const passwordLength = password.length;
    const nextPasswordInvalid = isCreate
      ? passwordLength < 8 || passwordLength > 128
      : passwordLength > 0 && (passwordLength < 8 || passwordLength > 128);
    const usernameLength = normalizedUsername.length;
    const nextUsernameInvalid =
      (!isCreate && usernameLength === 0) ||
      usernameLength > MAX_USERNAME_LENGTH ||
      usernameHasControlCharacter(username);
    const nextNotesInvalid = normalizedNotes.length > MAX_NOTES_LENGTH;
    const parsedBalance = isCreate ? usdInputToMicrousd(balance) : 0;
    const parsedConcurrencyLimit = requestLimitInputToNumber(concurrencyLimit);
    const parsedRpmLimit = requestLimitInputToNumber(rpmLimit);

    setEmailInvalid(nextEmailInvalid);
    setPasswordInvalid(nextPasswordInvalid);
    setUsernameInvalid(nextUsernameInvalid);
    setNotesInvalid(nextNotesInvalid);
    setBalanceInvalid(parsedBalance === null);
    setConcurrencyLimitInvalid(parsedConcurrencyLimit === null);
    setRpmLimitInvalid(parsedRpmLimit === null);

    const invalidControlName = nextEmailInvalid
      ? 'email'
      : nextPasswordInvalid
        ? 'password'
        : nextUsernameInvalid
          ? 'username'
          : nextNotesInvalid
            ? 'notes'
            : parsedBalance === null
              ? 'balance'
              : parsedConcurrencyLimit === null
                ? 'concurrencyLimit'
                : parsedRpmLimit === null
                  ? 'rpmLimit'
                  : null;
    if (invalidControlName) {
      const invalidControl = event.currentTarget.elements.namedItem(invalidControlName);
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }
    if (parsedBalance === null || parsedConcurrencyLimit === null || parsedRpmLimit === null) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        isCreate
          ? {
              kind: 'create',
              value: {
                balanceMicrousd: parsedBalance,
                concurrencyLimit: parsedConcurrencyLimit,
                email: normalizedEmail,
                password,
                role,
                rpmLimit: parsedRpmLimit,
                ...(normalizedUsername ? { username: normalizedUsername } : {}),
              },
            }
          : {
              kind: 'edit',
              value: {
                concurrencyLimit: parsedConcurrencyLimit,
                email: normalizedEmail,
                notes: normalizedNotes,
                ...(password ? { password } : {}),
                role,
                rpmLimit: parsedRpmLimit,
                status,
                username: normalizedUsername,
              },
            },
      );
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps the dialog open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-7 sm:py-6 sm:pr-14">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              {isCreate ? (
                <UserPlus aria-hidden="true" className="size-5" />
              ) : (
                <UserCog aria-hidden="true" className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
              <DialogDescription className="mt-2">
                {t(`${translationPath}.description`)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <TextField
              autoComplete="email"
              error={t(`${translationPath}.emailError`)}
              fieldId={`${fieldId}-email`}
              invalid={emailInvalid}
              label={t(`${translationPath}.fields.email`)}
              name="email"
              onChange={(value) => {
                setEmail(value);
                setEmailInvalid(false);
              }}
              placeholder={isCreate ? t(`${translationPath}.emailPlaceholder`) : undefined}
              type="email"
              value={email}
            />

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-password`}>
                {t(`${translationPath}.fields.password`)}
              </Label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input
                    aria-describedby={`${fieldId}-password-${passwordInvalid ? 'error' : 'hint'}`}
                    aria-invalid={passwordInvalid ? true : undefined}
                    autoComplete="new-password"
                    className="w-full pr-11 font-mono"
                    id={`${fieldId}-password`}
                    name="password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordCopied(false);
                      setPasswordInvalid(false);
                    }}
                    placeholder={t(`${translationPath}.passwordPlaceholder`)}
                    type="text"
                    value={password}
                  />
                  <Button
                    aria-label={t(
                      `${translationPath}.${passwordCopied ? 'passwordCopied' : 'copyPassword'}`,
                    )}
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={!password}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(password);
                        setPasswordCopied(true);
                      } catch {
                        setPasswordCopied(false);
                      }
                    }}
                    size="icon-sm"
                    title={t(
                      `${translationPath}.${passwordCopied ? 'passwordCopied' : 'copyPassword'}`,
                    )}
                    type="button"
                    variant="ghost"
                  >
                    {passwordCopied ? (
                      <Check aria-hidden="true" className="text-success" />
                    ) : (
                      <Clipboard aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <Button
                  aria-label={t(`${translationPath}.generatePassword`)}
                  className="size-10 shrink-0"
                  onClick={() => {
                    setPassword(generatePassword());
                    setPasswordCopied(false);
                    setPasswordInvalid(false);
                  }}
                  title={t(`${translationPath}.generatePassword`)}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw aria-hidden="true" />
                </Button>
              </div>
              <p
                className={
                  passwordInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
                }
                id={`${fieldId}-password-${passwordInvalid ? 'error' : 'hint'}`}
              >
                {t(`${translationPath}.${passwordInvalid ? 'passwordError' : 'passwordHint'}`)}
              </p>
            </div>

            <TextField
              autoComplete="username"
              error={t(`${translationPath}.usernameError`)}
              fieldId={`${fieldId}-username`}
              invalid={usernameInvalid}
              label={t(`${translationPath}.fields.username`)}
              maxLength={MAX_USERNAME_LENGTH}
              name="username"
              onChange={(value) => {
                setUsername(value);
                setUsernameInvalid(false);
              }}
              value={username}
              placeholder={isCreate ? t(`${translationPath}.usernamePlaceholder`) : undefined}
            />

            {isCreate && !usernameInvalid && (
              <p className="-mt-3 text-xs text-muted-foreground">
                {t(`${translationPath}.usernameHint`)}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-role`}>{t(`${translationPath}.fields.role`)}</Label>
              <Select
                disabled={isCurrentUser}
                onValueChange={(value) => setRole(value as AdminUserRole)}
                value={role}
              >
                <SelectTrigger className="w-full" id={`${fieldId}-role`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`pages.account.sections.admin.users.roles.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isCreate && (
              <div className="grid gap-2">
                <Label htmlFor={`${fieldId}-notes`}>{t(`${translationPath}.fields.notes`)}</Label>
                <Textarea
                  aria-describedby={`${fieldId}-notes-${notesInvalid ? 'error' : 'hint'}`}
                  aria-invalid={notesInvalid ? true : undefined}
                  className="min-h-24 resize-y"
                  id={`${fieldId}-notes`}
                  maxLength={MAX_NOTES_LENGTH}
                  name="notes"
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setNotesInvalid(false);
                  }}
                  value={notes}
                />
                <p
                  className={
                    notesInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
                  }
                  id={`${fieldId}-notes-${notesInvalid ? 'error' : 'hint'}`}
                >
                  {t(`${translationPath}.${notesInvalid ? 'notesError' : 'notesHint'}`, {
                    count: notes.length,
                    max: MAX_NOTES_LENGTH,
                  })}
                </p>
              </div>
            )}

            {!isCreate && (
              <div className="grid content-start gap-2">
                <Label htmlFor={`${fieldId}-status`}>{t(`${translationPath}.fields.status`)}</Label>
                <Select
                  disabled={isCurrentUser}
                  onValueChange={(value) => setStatus(value as AdminUserStatus)}
                  value={status}
                >
                  <SelectTrigger className="w-full" id={`${fieldId}-status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`pages.account.sections.admin.users.statuses.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCurrentUser && (
                  <p className="text-xs text-muted-foreground">
                    {t(`${translationPath}.selfHint`)}
                  </p>
                )}
              </div>
            )}

            {isCreate ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                  <Label htmlFor={`${fieldId}-balance`}>
                    {t(`${translationPath}.fields.balance`)}
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      aria-describedby={balanceInvalid ? `${fieldId}-balance-error` : undefined}
                      aria-invalid={balanceInvalid ? true : undefined}
                      className="pl-8 font-mono"
                      id={`${fieldId}-balance`}
                      inputMode="decimal"
                      name="balance"
                      onChange={(event) => {
                        setBalance(event.target.value);
                        setBalanceInvalid(false);
                      }}
                      value={balance}
                    />
                  </div>
                  {balanceInvalid && (
                    <p className="text-xs text-destructive" id={`${fieldId}-balance-error`}>
                      {t(`${translationPath}.balanceError`)}
                    </p>
                  )}
                </div>

                <RequestLimitField
                  fieldId={`${fieldId}-concurrency-limit`}
                  hint={t(`${translationPath}.concurrencyHint`)}
                  invalid={concurrencyLimitInvalid}
                  invalidMessage={t(`${translationPath}.limitError`)}
                  label={t(`${translationPath}.fields.concurrencyLimit`)}
                  name="concurrencyLimit"
                  onChange={(value) => {
                    setConcurrencyLimit(value);
                    setConcurrencyLimitInvalid(false);
                  }}
                  value={concurrencyLimit}
                />
              </div>
            ) : (
              <RequestLimitField
                fieldId={`${fieldId}-concurrency-limit`}
                hint={t(`${translationPath}.concurrencyHint`)}
                invalid={concurrencyLimitInvalid}
                invalidMessage={t(`${translationPath}.limitError`)}
                label={t(`${translationPath}.fields.concurrencyLimit`)}
                name="concurrencyLimit"
                onChange={(value) => {
                  setConcurrencyLimit(value);
                  setConcurrencyLimitInvalid(false);
                }}
                value={concurrencyLimit}
              />
            )}

            <RequestLimitField
              fieldId={`${fieldId}-rpm-limit`}
              hint={t(`${translationPath}.rpmHint`)}
              invalid={rpmLimitInvalid}
              invalidMessage={t(`${translationPath}.limitError`)}
              label={t(`${translationPath}.fields.rpmLimit`)}
              name="rpmLimit"
              onChange={(value) => {
                setRpmLimit(value);
                setRpmLimitInvalid(false);
              }}
              value={rpmLimit}
            />
          </div>

          <DialogFooter className="flex-row justify-end border-t border-border bg-background px-5 py-4 sm:px-7">
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button disabled={isSubmitting || !target} type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(`${translationPath}.${isCreate ? 'create' : 'save'}`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  autoComplete,
  error,
  fieldId,
  invalid,
  label,
  maxLength,
  name,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete: string;
  error: string;
  fieldId: string;
  invalid: boolean;
  label: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'email' | 'text';
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        aria-describedby={invalid ? `${fieldId}-error` : undefined}
        aria-invalid={invalid ? true : undefined}
        autoComplete={autoComplete}
        id={fieldId}
        maxLength={maxLength}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {invalid && (
        <p className="text-xs text-destructive" id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function RequestLimitField({
  fieldId,
  hint,
  invalid,
  invalidMessage,
  label,
  name,
  onChange,
  value,
}: {
  fieldId: string;
  hint: string;
  invalid: boolean;
  invalidMessage: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const descriptionId = `${fieldId}-${invalid ? 'error' : 'hint'}`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        aria-describedby={descriptionId}
        aria-invalid={invalid ? true : undefined}
        className="font-mono"
        id={fieldId}
        inputMode="numeric"
        max={MAX_USER_REQUEST_LIMIT}
        min={0}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        step={1}
        type="number"
        value={value}
      />
      <p
        className={invalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        id={descriptionId}
      >
        {invalid ? invalidMessage : hint}
      </p>
    </div>
  );
}

function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const allCharacters = `${uppercase}${lowercase}${numbers}${symbols}`;
  const characters = [
    secureRandomCharacter(uppercase),
    secureRandomCharacter(lowercase),
    secureRandomCharacter(numbers),
    secureRandomCharacter(symbols),
  ];

  while (characters.length < 16) characters.push(secureRandomCharacter(allCharacters));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

function secureRandomCharacter(characters: string): string {
  return characters[secureRandomIndex(characters.length)] ?? '';
}

function secureRandomIndex(length: number): number {
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  return (random[0] ?? 0) % length;
}

function isEmailInputValid(value: string): boolean {
  if (value.length === 0 || value.length > 254 || /\s/.test(value)) return false;
  const separator = value.indexOf('@');
  if (separator <= 0 || separator !== value.lastIndexOf('@')) return false;
  const domain = value.slice(separator + 1);
  return (
    domain.length > 0 && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
  );
}

function usernameHasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => /\p{Cc}/u.test(character));
}

function requestLimitInputToNumber(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)$/.test(normalized)) return null;

  const limit = Number(normalized);
  return Number.isSafeInteger(limit) && limit <= MAX_USER_REQUEST_LIMIT ? limit : null;
}
