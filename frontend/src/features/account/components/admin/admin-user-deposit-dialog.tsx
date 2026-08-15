import { LoaderCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import type { AdminUser } from '@/features/account/api/admin-users';
import { formatMicrousd } from '@/features/account/components/admin/admin-demo-data';
import {
  microusdToUsdInput,
  usdInputToMicrousd,
} from '@/features/account/components/admin/admin-money';

const MAX_NOTES_LENGTH = 1_000;
export type AdminUserBalanceAdjustmentKind = 'deposit' | 'refund';

export function AdminUserBalanceAdjustmentDialog({
  kind,
  onAdjust,
  onOpenChange,
  open,
  user,
}: {
  kind: AdminUserBalanceAdjustmentKind;
  onAdjust: (amountMicrousd: number, notes: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  user: AdminUser | null;
}) {
  const { i18n, t } = useTranslation();
  const fieldId = useId();
  const [amount, setAmount] = useState('0');
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translationPath = `pages.account.sections.admin.users.${kind}Dialog`;

  useEffect(() => {
    if (!open || !user) return;
    setAmount('0');
    setAmountInvalid(false);
    setNotes('');
  }, [kind, open, user]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMicrousd = usdInputToMicrousd(amount);
    const invalid =
      amountMicrousd === null ||
      amountMicrousd <= 0 ||
      (kind === 'refund' && user !== null && amountMicrousd > user.balanceMicrousd);
    setAmountInvalid(invalid);
    if (invalid || amountMicrousd === null || !user) {
      const amountControl = event.currentTarget.elements.namedItem('amount');
      if (invalid && amountControl instanceof HTMLElement) amountControl.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdjust(amountMicrousd, notes.trim());
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps this dialog open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="z-[60] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl"
        closeLabel={t('common.close')}
        overlayClassName="z-[60]"
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-7 sm:py-6 sm:pr-14">
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription className="sr-only">
            {t(`${translationPath}.description`)}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {user && (
              <div className="flex min-w-0 items-center gap-4 rounded-xl bg-secondary/65 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-base font-semibold text-primary">
                  {user.id}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-base">{user.email}</strong>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {t(`${translationPath}.currentBalance`, {
                      balance: formatMicrousd(i18n.resolvedLanguage, user.balanceMicrousd),
                    })}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-amount`}>{t(`${translationPath}.amount`)}</Label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    aria-describedby={amountInvalid ? `${fieldId}-amount-error` : undefined}
                    aria-invalid={amountInvalid ? true : undefined}
                    autoFocus
                    className="h-11 pl-8 font-mono"
                    id={`${fieldId}-amount`}
                    inputMode="decimal"
                    name="amount"
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setAmountInvalid(false);
                    }}
                    value={amount}
                  />
                </div>
                {kind === 'refund' && (
                  <Button
                    className="h-11 shrink-0 px-5"
                    disabled={!user || user.balanceMicrousd <= 0}
                    onClick={() => {
                      if (!user) return;
                      setAmount(microusdToUsdInput(user.balanceMicrousd));
                      setAmountInvalid(false);
                    }}
                    type="button"
                    variant="outline"
                  >
                    {t(`${translationPath}.all`)}
                  </Button>
                )}
              </div>
              {amountInvalid && (
                <p className="text-xs text-destructive" id={`${fieldId}-amount-error`}>
                  {t(`${translationPath}.amountError`)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-notes`}>{t(`${translationPath}.notes`)}</Label>
              <Textarea
                className="min-h-28 resize-y"
                id={`${fieldId}-notes`}
                maxLength={MAX_NOTES_LENGTH}
                name="notes"
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
            </div>
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
            <Button
              disabled={isSubmitting || !user || (kind === 'refund' && user.balanceMicrousd <= 0)}
              type="submit"
              variant={kind === 'refund' ? 'destructive' : 'default'}
            >
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(`${translationPath}.confirm`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
