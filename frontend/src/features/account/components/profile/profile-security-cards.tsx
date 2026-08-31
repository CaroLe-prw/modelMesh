import { Eye, EyeOff, KeyRound, LockKeyhole, Plus, ShieldCheck } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';

const securityToastId = 'profile-security-feedback';

export function ProfileSecurityCards() {
  const { t } = useTranslation();

  function showUnavailableFeedback() {
    toast.info(t('pages.account.sections.profile.feedback.notConnected'), {
      id: securityToastId,
    });
  }

  function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (newPassword !== confirmPassword) {
      toast.error(t('pages.account.sections.profile.password.mismatch'), {
        id: securityToastId,
      });
      return;
    }

    showUnavailableFeedback();
  }

  return (
    <>
      <Card className="gap-0 py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.profile.password.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.password.description')}
          </p>
        </div>
        <form className="grid gap-4 p-5 sm:p-6" onSubmit={handlePasswordSubmit}>
          <PasswordField
            autoComplete="current-password"
            label={t('pages.account.sections.profile.password.current')}
            name="currentPassword"
          />
          <PasswordField
            autoComplete="new-password"
            label={t('pages.account.sections.profile.password.new')}
            name="newPassword"
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            {t('pages.account.sections.profile.password.hint')}
          </p>
          <PasswordField
            autoComplete="new-password"
            label={t('pages.account.sections.profile.password.confirm')}
            name="confirmPassword"
          />
          <div className="flex justify-end">
            <Button type="submit">
              <LockKeyhole aria-hidden="true" className="size-4" />
              {t('pages.account.sections.profile.password.action')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.profile.twoFactor.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.twoFactor.description')}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-warning/12 text-warning">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <strong className="block text-sm">
                {t('pages.account.sections.profile.twoFactor.disabled')}
              </strong>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('pages.account.sections.profile.twoFactor.recommendation')}
              </p>
            </div>
          </div>
          <Button onClick={showUnavailableFeedback} type="button" variant="outline">
            {t('pages.account.sections.profile.twoFactor.action')}
          </Button>
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.profile.passkeys.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.passkeys.description')}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-border p-6 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <KeyRound aria-hidden="true" className="size-5" />
              </span>
              <strong className="mt-3 block text-sm">
                {t('pages.account.sections.profile.passkeys.empty')}
              </strong>
              <Button
                className="mt-4"
                onClick={showUnavailableFeedback}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus aria-hidden="true" className="size-4" />
                {t('pages.account.sections.profile.passkeys.action')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

interface PasswordFieldProps {
  autoComplete: string;
  label: string;
  name: string;
}

function PasswordField({ autoComplete, label, name }: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          autoComplete={autoComplete}
          className="h-11 pr-11"
          id={name}
          maxLength={128}
          minLength={8}
          name={name}
          required
          type={visible ? 'text' : 'password'}
        />
        <Toggle
          aria-label={visible ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')}
          className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2 p-0 text-muted-foreground"
          onPressedChange={setVisible}
          pressed={visible}
          title={visible ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')}
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </Toggle>
      </div>
    </div>
  );
}
