import { Building2, LoaderCircle } from 'lucide-react';
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
import type { BrandItem, BrandUpdateDraft } from '@/features/account/api/brands';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';

type EditBrandField = 'name' | 'sortOrder';
type EditBrandErrors = Partial<Record<EditBrandField, 'invalid' | 'required'>>;

export function EditBrandDialog({
  brand,
  onOpenChange,
  onSave,
  open,
}: {
  brand: BrandItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: BrandUpdateDraft) => Promise<void>;
  open: boolean;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [errors, setErrors] = useState<EditBrandErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translationPath = 'pages.account.sections.admin.catalogManagement.brands.editDialog';

  useEffect(() => {
    if (!open || !brand) return;
    setName(brand.name);
    setSortOrder(String(brand.sortOrder));
    setErrors({});
  }, [brand, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brand) return;

    const normalizedName = name.trim();
    const normalizedSortOrder = Number.parseInt(sortOrder, 10);
    const nextErrors: EditBrandErrors = {};
    if (normalizedName.length === 0) {
      nextErrors.name = 'required';
    } else if (Array.from(normalizedName).length > 80) {
      nextErrors.name = 'invalid';
    }
    if (!Number.isInteger(normalizedSortOrder) || normalizedSortOrder < 0) {
      nextErrors.sortOrder = 'invalid';
    }

    const firstInvalidField = (Object.keys(nextErrors) as EditBrandField[])[0];
    if (firstInvalidField) {
      setErrors(nextErrors);
      const invalidControl = event.currentTarget.elements.namedItem(firstInvalidField);
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ name: normalizedName, sortOrder: normalizedSortOrder });
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps the dialog open for correction.
    } finally {
      setIsSubmitting(false);
    }
  }

  function errorMessage(field: EditBrandField) {
    const error = errors[field];
    return error ? t(`${translationPath}.errors.${field}.${error}`) : undefined;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-lg"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-6 sm:py-6 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
              <DialogDescription className="mt-2">
                {t(`${translationPath}.description`)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit}>
          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
            {brand && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/45 p-4">
                <BrandAvatar src={brand.avatarUrl} svg={brand.avatarSvg} />
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{name.trim() || brand.name}</strong>
                  <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                    {brand.id}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-name`}>{t(`${translationPath}.fields.name.label`)}</Label>
              <Input
                aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
                aria-invalid={errors.name ? true : undefined}
                autoComplete="organization"
                autoFocus
                id={`${fieldId}-name`}
                maxLength={80}
                name="name"
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                value={name}
              />
              {errors.name ? (
                <p className="text-xs text-destructive" id={`${fieldId}-name-error`}>
                  {errorMessage('name')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t(`${translationPath}.fields.name.hint`)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-identifier`}>
                {t(`${translationPath}.fields.identifier.label`)}
              </Label>
              <Input
                className="font-mono"
                disabled
                id={`${fieldId}-identifier`}
                readOnly
                value={brand?.id ?? ''}
              />
              <p className="text-xs text-muted-foreground">
                {t(`${translationPath}.fields.identifier.hint`)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-sort-order`}>
                {t(`${translationPath}.fields.sortOrder.label`)}
              </Label>
              <Input
                aria-describedby={errors.sortOrder ? `${fieldId}-sort-order-error` : undefined}
                aria-invalid={errors.sortOrder ? true : undefined}
                id={`${fieldId}-sort-order`}
                min="0"
                name="sortOrder"
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setErrors((current) => ({ ...current, sortOrder: undefined }));
                }}
                step="10"
                type="number"
                value={sortOrder}
              />
              {errors.sortOrder ? (
                <p className="text-xs text-destructive" id={`${fieldId}-sort-order-error`}>
                  {errorMessage('sortOrder')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t(`${translationPath}.fields.sortOrder.hint`)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button disabled={isSubmitting || !brand} type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(`${translationPath}.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
