import { Activity, AlertCircle, LoaderCircle, RadioTower, RefreshCw, Save } from 'lucide-react';
import { useEffect, useId, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type {
  MerchantChannel,
  MerchantChannelControlStatus,
  MerchantChannelDraft,
  MerchantChannelProvider,
} from '@/features/account/api/merchant-channels';

interface MerchantChannelDialogProps {
  channel: MerchantChannel | null;
  channels: MerchantChannel[];
  disabled: boolean;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onProviderRetry: () => void;
  onSave: (draft: MerchantChannelDraft) => Promise<void>;
  open: boolean;
  providerStatus: 'error' | 'loading' | 'ready';
  providers: MerchantChannelProvider[];
}

const channelStatuses: MerchantChannelControlStatus[] = ['active', 'offline'];

export function MerchantChannelDialog({
  channel,
  channels,
  disabled,
  mode,
  onOpenChange,
  onProviderRetry,
  onSave,
  open,
  providerStatus,
  providers,
}: MerchantChannelDialogProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('');
  const [status, setStatus] = useState<MerchantChannelControlStatus>('offline');
  const [nameError, setNameError] = useState<'duplicate' | 'required' | null>(null);
  const [providerError, setProviderError] = useState<'required' | null>(null);
  const translationPath = 'pages.account.sections.merchant.channels.dialog';

  useEffect(() => {
    if (!open) return;

    setName(channel?.name ?? '');
    setProviderId(channel?.providerId ?? '');
    setStatus(channel?.status === 'offline' ? 'offline' : 'active');
    setNameError(null);
    setProviderError(null);
  }, [channel, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled) onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    if (normalizedName.length === 0 || providerId.length === 0) {
      setNameError(normalizedName.length === 0 ? 'required' : null);
      setProviderError(providerId.length === 0 ? 'required' : null);
      const invalidField = normalizedName.length === 0 ? 'name' : 'providerId';
      const invalidControl = event.currentTarget.elements.namedItem(invalidField);
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }

    const duplicateName = channels.some(
      (item) =>
        item.id !== channel?.id &&
        item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );

    if (duplicateName) {
      setNameError('duplicate');
      const nameControl = event.currentTarget.elements.namedItem('name');
      if (nameControl instanceof HTMLElement) nameControl.focus();
      return;
    }

    try {
      await onSave({ name: normalizedName, providerId, status });
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps the dialog open for correction.
    }
  }

  const isEditing = mode === 'edit' && channel !== null;
  const selectableProviders =
    channel && !providers.some((provider) => provider.id === channel.providerId)
      ? [{ id: channel.providerId, name: channel.provider }, ...providers]
      : providers;
  const providerOptions = selectableProviders.map((provider) => ({
    description: provider.id,
    label: provider.name,
    value: provider.id,
  }));
  const providerControlDisabled =
    disabled || selectableProviders.length === 0 || (providerStatus !== 'ready' && !isEditing);
  const submitDisabled = disabled || (providerStatus !== 'ready' && !isEditing);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-6 sm:py-6 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <RadioTower aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>
                {t(`${translationPath}.${isEditing ? 'editTitle' : 'createTitle'}`)}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {t(`${translationPath}.${isEditing ? 'editDescription' : 'createDescription'}`)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
            {isEditing ? <ChannelHealthSummary channel={channel} /> : null}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-name`}>{t(`${translationPath}.fields.name.label`)}</Label>
              <Input
                aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
                aria-invalid={nameError ? true : undefined}
                autoComplete="off"
                autoFocus
                id={`${fieldId}-name`}
                maxLength={80}
                name="name"
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                placeholder={t(`${translationPath}.fields.name.placeholder`)}
                required
                value={name}
              />
              {nameError ? (
                <p className="text-xs text-destructive" id={`${fieldId}-name-error`}>
                  {t(`${translationPath}.errors.name.${nameError}`)}
                </p>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t(`${translationPath}.fields.name.hint`)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-provider-trigger`}>
                {t(`${translationPath}.fields.provider.label`)}
              </Label>
              <SearchableSelect
                aria-describedby={providerError ? `${fieldId}-provider-error` : undefined}
                aria-invalid={providerError ? true : undefined}
                disabled={providerControlDisabled}
                emptyText={t(`${translationPath}.fields.provider.empty`)}
                id={`${fieldId}-provider-trigger`}
                name="providerId"
                onValueChange={(value) => {
                  setProviderId(value);
                  setProviderError(null);
                }}
                options={providerOptions}
                placeholder={t(`${translationPath}.fields.provider.placeholder`)}
                searchPlaceholder={t(`${translationPath}.fields.provider.searchPlaceholder`)}
                value={providerId}
              />
              {providerStatus === 'loading' && !isEditing ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  {t(`${translationPath}.fields.provider.loading`)}
                </p>
              ) : providerStatus === 'error' ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
                  <AlertCircle aria-hidden="true" className="size-3.5" />
                  <span>{t(`${translationPath}.fields.provider.loadError`)}</span>
                  <Button onClick={onProviderRetry} size="xs" type="button" variant="outline">
                    <RefreshCw aria-hidden="true" />
                    {t(`${translationPath}.fields.provider.retry`)}
                  </Button>
                </div>
              ) : providerError ? (
                <p className="text-xs text-destructive" id={`${fieldId}-provider-error`}>
                  {t(`${translationPath}.errors.provider.${providerError}`)}
                </p>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t(`${translationPath}.fields.provider.hint`)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-status-trigger`}>
                {t(`${translationPath}.fields.status.label`)}
              </Label>
              <Select
                onValueChange={(value) => setStatus(value as MerchantChannelControlStatus)}
                value={status}
              >
                <SelectTrigger
                  aria-label={t(`${translationPath}.fields.status.label`)}
                  id={`${fieldId}-status-trigger`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channelStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`${translationPath}.fields.status.options.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {t(`${translationPath}.fields.status.hint`)}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                disabled={disabled}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                {t(`${translationPath}.cancel`)}
              </Button>
              <Button disabled={submitDisabled} type="submit">
                {disabled ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : isEditing ? (
                  <Save aria-hidden="true" />
                ) : (
                  <RadioTower aria-hidden="true" />
                )}
                {t(`${translationPath}.${isEditing ? 'save' : 'create'}`)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChannelHealthSummary({ channel }: { channel: MerchantChannel }) {
  const { t } = useTranslation();
  const translationPath = 'pages.account.sections.merchant.channels.dialog.health';
  const metrics = [
    { label: t(`${translationPath}.models`), value: String(channel.modelCount) },
    { label: t(`${translationPath}.successRate`), value: `${channel.successRate.toFixed(2)}%` },
    {
      label: t(`${translationPath}.latency`),
      value: channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—',
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-secondary/45 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Activity aria-hidden="true" className="size-4 text-primary" />
        {t(`${translationPath}.title`)}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div className="min-w-0" key={metric.label}>
            <dt className="text-xs text-muted-foreground">{metric.label}</dt>
            <dd className="mt-1 truncate font-mono text-sm font-semibold">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
