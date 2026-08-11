import { Building2, ImageUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { findBrandPreset, type BrandPreset } from '@/features/account/api/brand-presets';
import type { BrandDraft } from '@/features/account/api/brands';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';
import { KnownBrandPicker } from '@/features/account/components/admin/known-brand-picker';

type BrandFormMode = 'custom' | 'known' | 'pick';

export type NewBrandDraft = BrandDraft;

type BrandFormField = 'avatar' | 'identifier' | 'name' | 'sortOrder';
type BrandFormError =
  | 'duplicate'
  | 'format'
  | 'invalid'
  | 'readFailed'
  | 'required'
  | 'tooLarge'
  | 'unsupported'
  | 'usePreset';
type BrandFormErrors = Partial<Record<BrandFormField, BrandFormError>>;

interface BrandFormState {
  avatar: { fileName: string; url: string } | null;
  identifier: string;
  isVisible: boolean;
  name: string;
  preset: BrandPreset | null;
  sortOrder: string;
}

const brandIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const acceptedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxAvatarSize = 2 * 1024 * 1024;

function createInitialForm(sortOrder: number): BrandFormState {
  return {
    avatar: null,
    identifier: '',
    isVisible: true,
    name: '',
    preset: null,
    sortOrder: String(sortOrder),
  };
}

export function AddBrandDialog({
  existingIds,
  onCreate,
  onPresetRetry,
  presets,
  presetStatus,
  suggestedSortOrder,
}: {
  existingIds: string[];
  onCreate: (brand: NewBrandDraft) => Promise<void>;
  onPresetRetry: () => void;
  presets: BrandPreset[];
  presetStatus: 'error' | 'loading' | 'ready';
  suggestedSortOrder: number;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<BrandFormErrors>({});
  const [form, setForm] = useState(() => createInitialForm(suggestedSortOrder));
  const [mode, setMode] = useState<BrandFormMode>('pick');
  const [open, setOpen] = useState(false);
  const [presetQuery, setPresetQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const translationPath = 'pages.account.sections.admin.catalogManagement.brands.createDialog';

  function resetForm(nextMode: BrandFormMode = 'pick') {
    setForm(createInitialForm(suggestedSortOrder));
    setErrors({});
    setMode(nextMode);
    setPresetQuery('');
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    if (nextOpen) resetForm();
    setOpen(nextOpen);
  }

  function updateField<Field extends keyof BrandFormState>(
    field: Field,
    value: BrandFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field !== 'isVisible' && field !== 'preset') {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function selectPreset(preset: BrandPreset) {
    setForm({
      ...createInitialForm(suggestedSortOrder),
      identifier: preset.id,
      name: preset.name,
      preset,
    });
    setErrors({});
    setMode('known');
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!acceptedAvatarTypes.has(file.type)) {
      setErrors((current) => ({ ...current, avatar: 'unsupported' }));
      event.target.value = '';
      return;
    }
    if (file.size > maxAvatarSize) {
      setErrors((current) => ({ ...current, avatar: 'tooLarge' }));
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') {
        setErrors((current) => ({ ...current, avatar: 'readFailed' }));
        return;
      }
      updateField('avatar', { fileName: file.name, url: reader.result });
    });
    reader.addEventListener('error', () => {
      setErrors((current) => ({ ...current, avatar: 'readFailed' }));
    });
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    updateField('avatar', null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'pick') return;

    const identifier = form.identifier.trim().toLocaleLowerCase();
    const name = form.name.trim();
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const nextErrors: BrandFormErrors = {};

    if (name.length === 0) nextErrors.name = 'required';
    if (identifier.length === 0) {
      nextErrors.identifier = 'required';
    } else if (!brandIdPattern.test(identifier)) {
      nextErrors.identifier = 'format';
    } else if (existingIds.some((id) => id.toLocaleLowerCase() === identifier)) {
      nextErrors.identifier = 'duplicate';
    } else if (mode === 'custom' && findBrandPreset(presets, name, identifier)) {
      nextErrors.identifier = 'usePreset';
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) nextErrors.sortOrder = 'invalid';

    const firstInvalidField = (Object.keys(nextErrors) as BrandFormField[])[0];
    if (firstInvalidField) {
      setErrors(nextErrors);
      const invalidControl = event.currentTarget.elements.namedItem(firstInvalidField);
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        ...(form.preset ? { presetId: form.preset.id } : {}),
        ...(form.avatar ? { avatarUrl: form.avatar.url } : {}),
        id: identifier,
        name,
        sortOrder,
        status: form.isVisible ? 'active' : 'hidden',
      });
      setOpen(false);
    } catch {
      // The parent reports the localized API error and keeps the dialog open for correction.
    } finally {
      setIsSubmitting(false);
    }
  }

  function errorMessage(field: BrandFormField) {
    const error = errors[field];
    return error ? t(`${translationPath}.errors.${field}.${error}`) : undefined;
  }

  const previewName = form.name.trim() || t(`${translationPath}.preview.nameFallback`);
  const previewIdentifier =
    form.identifier.trim().toLocaleLowerCase() || t(`${translationPath}.preview.idFallback`);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          {t('pages.account.sections.admin.catalogManagement.brands.add')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl"
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

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="grid min-h-0 gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {mode === 'pick' ? (
              <KnownBrandPicker
                existingIds={existingIds}
                onCustom={() => resetForm('custom')}
                onQueryChange={setPresetQuery}
                onRetry={onPresetRetry}
                onSelect={selectPreset}
                presets={presets}
                query={presetQuery}
                status={presetStatus}
              />
            ) : (
              <>
                <div className="rounded-xl border border-border bg-secondary/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t(`${translationPath}.preview.label`)}
                    </p>
                    <Badge variant="secondary">
                      {t(
                        `${translationPath}.picker.${mode === 'known' ? 'builtIn' : 'customBadge'}`,
                      )}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <BrandAvatar
                      size="preview"
                      src={form.avatar?.url}
                      svg={form.preset?.avatarSvg}
                    />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{previewName}</strong>
                      <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                        {previewIdentifier}
                      </span>
                    </div>
                    <Button onClick={() => resetForm()} size="sm" type="button" variant="ghost">
                      <RotateCcw aria-hidden="true" />
                      {t(`${translationPath}.picker.change`)}
                    </Button>
                  </div>
                </div>

                {mode === 'custom' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor={`${fieldId}-name`}>
                        {t(`${translationPath}.fields.name.label`)}
                      </Label>
                      <Input
                        aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
                        aria-invalid={errors.name ? true : undefined}
                        autoComplete="organization"
                        autoFocus
                        id={`${fieldId}-name`}
                        maxLength={40}
                        name="name"
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder={t(`${translationPath}.fields.name.placeholder`)}
                        value={form.name}
                      />
                      {errors.name && (
                        <p
                          className="text-xs text-destructive"
                          id={`${fieldId}-name-error`}
                          role="alert"
                        >
                          {errorMessage('name')}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`${fieldId}-identifier`}>
                        {t(`${translationPath}.fields.identifier.label`)}
                      </Label>
                      <Input
                        aria-describedby={`${fieldId}-identifier-hint${errors.identifier ? ` ${fieldId}-identifier-error` : ''}`}
                        aria-invalid={errors.identifier ? true : undefined}
                        autoCapitalize="none"
                        autoComplete="off"
                        id={`${fieldId}-identifier`}
                        maxLength={40}
                        name="identifier"
                        onChange={(event) => updateField('identifier', event.target.value)}
                        placeholder={t(`${translationPath}.fields.identifier.placeholder`)}
                        spellCheck={false}
                        value={form.identifier}
                      />
                      <p
                        className="text-xs leading-5 text-muted-foreground"
                        id={`${fieldId}-identifier-hint`}
                      >
                        {t(`${translationPath}.fields.identifier.hint`)}
                      </p>
                      {errors.identifier && (
                        <p
                          className="text-xs text-destructive"
                          id={`${fieldId}-identifier-error`}
                          role="alert"
                        >
                          {errorMessage('identifier')}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div
                  className={
                    mode === 'custom'
                      ? 'grid gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'
                      : 'grid gap-4 sm:grid-cols-2'
                  }
                >
                  {mode === 'custom' && (
                    <div className="grid content-start gap-2">
                      <Label htmlFor={`${fieldId}-avatar`}>
                        {t(`${translationPath}.fields.avatar.label`)}
                      </Label>
                      <Input
                        accept="image/png,image/jpeg,image/webp"
                        aria-describedby={`${fieldId}-avatar-hint${errors.avatar ? ` ${fieldId}-avatar-error` : ''}`}
                        aria-invalid={errors.avatar ? true : undefined}
                        className="sr-only"
                        id={`${fieldId}-avatar`}
                        name="avatar"
                        onChange={handleAvatarChange}
                        ref={avatarInputRef}
                        type="file"
                      />
                      <div className="flex min-h-24 items-center gap-3 rounded-xl border border-border bg-secondary/35 p-3">
                        <BrandAvatar size="picker" src={form.avatar?.url} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Label className="cursor-pointer" htmlFor={`${fieldId}-avatar`}>
                                <ImageUp aria-hidden="true" />
                                {t(
                                  `${translationPath}.fields.avatar.${form.avatar ? 'replace' : 'choose'}`,
                                )}
                              </Label>
                            </Button>
                            {form.avatar && (
                              <Button
                                onClick={removeAvatar}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 aria-hidden="true" />
                                {t(`${translationPath}.fields.avatar.remove`)}
                              </Button>
                            )}
                          </div>
                          {form.avatar && (
                            <p
                              className="mt-2 truncate text-xs text-foreground"
                              title={form.avatar.fileName}
                            >
                              {form.avatar.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                      <p
                        className="text-xs leading-5 text-muted-foreground"
                        id={`${fieldId}-avatar-hint`}
                      >
                        {t(`${translationPath}.fields.avatar.hint`)}
                      </p>
                      {errors.avatar && (
                        <p
                          className="text-xs text-destructive"
                          id={`${fieldId}-avatar-error`}
                          role="alert"
                        >
                          {errorMessage('avatar')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid content-start gap-2">
                    <Label htmlFor={`${fieldId}-sortOrder`}>
                      {t(`${translationPath}.fields.sortOrder.label`)}
                    </Label>
                    <Input
                      aria-describedby={`${fieldId}-sortOrder-hint${errors.sortOrder ? ` ${fieldId}-sortOrder-error` : ''}`}
                      aria-invalid={errors.sortOrder ? true : undefined}
                      id={`${fieldId}-sortOrder`}
                      inputMode="numeric"
                      min="0"
                      name="sortOrder"
                      onChange={(event) => updateField('sortOrder', event.target.value)}
                      step="10"
                      type="number"
                      value={form.sortOrder}
                    />
                    <p
                      className="text-xs leading-5 text-muted-foreground"
                      id={`${fieldId}-sortOrder-hint`}
                    >
                      {t(`${translationPath}.fields.sortOrder.hint`)}
                    </p>
                    {errors.sortOrder && (
                      <p
                        className="text-xs text-destructive"
                        id={`${fieldId}-sortOrder-error`}
                        role="alert"
                      >
                        {errorMessage('sortOrder')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                  <div className="min-w-0">
                    <Label htmlFor={`${fieldId}-visible`}>
                      {t(`${translationPath}.fields.visibility.label`)}
                    </Label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(`${translationPath}.fields.visibility.hint`)}
                    </p>
                  </div>
                  <Switch
                    aria-label={t(`${translationPath}.fields.visibility.label`)}
                    checked={form.isVisible}
                    id={`${fieldId}-visible`}
                    onCheckedChange={(checked) => updateField('isVisible', checked)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
            <Button
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {t(`${translationPath}.cancel`)}
            </Button>
            <Button disabled={mode === 'pick' || isSubmitting} type="submit">
              <Plus aria-hidden="true" />
              {t(`${translationPath}.submit`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
