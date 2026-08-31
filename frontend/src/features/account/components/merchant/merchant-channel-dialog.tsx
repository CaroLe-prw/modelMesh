import {
  Activity,
  AlertCircle,
  Download,
  LockKeyhole,
  LoaderCircle,
  Plus,
  RadioTower,
  RefreshCw,
  Save,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
import { discoverMerchantChannelModels } from '@/features/account/api/merchant-channels';
import { mergeModelOptions } from '@/features/account/components/merchant/merchant-channel-model-options';
import { MerchantChannelModelSelector } from '@/features/account/components/merchant/merchant-channel-model-selector';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';

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
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [supportedModels, setSupportedModels] = useState<string[]>([]);
  const [manualModel, setManualModel] = useState('');
  const [status, setStatus] = useState<MerchantChannelControlStatus>('offline');
  const [nameError, setNameError] = useState<'duplicate' | 'required' | null>(null);
  const [providerError, setProviderError] = useState<'required' | null>(null);
  const [baseUrlError, setBaseUrlError] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [discoveryState, setDiscoveryState] = useState<'error' | 'idle' | 'loading' | 'ready'>(
    'idle',
  );
  const [discoveryErrorKey, setDiscoveryErrorKey] = useState('connection');
  const translationPath = 'pages.account.sections.merchant.channels.dialog';

  useEffect(() => {
    if (!open) return;

    setName(channel?.name ?? '');
    setProviderId(channel?.providerId ?? '');
    setBaseUrl(channel?.baseUrl ?? '');
    setApiKey('');
    setDescription(channel?.description ?? '');
    setAvailableModels(
      mergeModelOptions(channel?.availableModels ?? [], channel?.supportedModels ?? []),
    );
    setSupportedModels(channel?.supportedModels ?? []);
    setManualModel('');
    setStatus(channel?.status === 'active' ? 'active' : 'offline');
    setNameError(null);
    setProviderError(null);
    setBaseUrlError(false);
    setApiKeyError(false);
    setDescriptionError(false);
    setModelsError(false);
    setDiscoveryState('idle');
  }, [channel, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!disabled && discoveryState !== 'loading') onOpenChange(nextOpen);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedBaseUrl = normalizeHttpsUrl(baseUrl);
    const normalizedApiKey = apiKey.trim();
    const apiKeyRequired = !channel?.apiKeyConfigured;
    const normalizedDescription = description.trim();
    const descriptionInvalid = normalizedDescription.length > 500;
    if (
      normalizedName.length === 0 ||
      providerId.length === 0 ||
      normalizedBaseUrl === null ||
      (apiKeyRequired && normalizedApiKey.length === 0) ||
      descriptionInvalid ||
      supportedModels.length === 0
    ) {
      setNameError(normalizedName.length === 0 ? 'required' : null);
      setProviderError(providerId.length === 0 ? 'required' : null);
      setBaseUrlError(normalizedBaseUrl === null);
      setApiKeyError(apiKeyRequired && normalizedApiKey.length === 0);
      setDescriptionError(descriptionInvalid);
      setModelsError(supportedModels.length === 0);
      const invalidField =
        normalizedName.length === 0
          ? 'name'
          : normalizedBaseUrl === null
            ? 'baseUrl'
            : apiKeyRequired && normalizedApiKey.length === 0
              ? 'apiKey'
              : descriptionInvalid
                ? 'description'
                : providerId.length === 0
                  ? 'providerId'
                  : 'models';
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
      await onSave({
        apiKey: normalizedApiKey || undefined,
        availableModels,
        baseUrl: normalizedBaseUrl,
        description: normalizedDescription,
        name: normalizedName,
        providerId,
        status,
        supportedModels,
      });
      onOpenChange(false);
    } catch {
      // The parent reports the localized API error and keeps the dialog open for correction.
    }
  }

  const isEditing = mode === 'edit' && channel !== null;
  const isResubmitting = isEditing && channel.status === 'rejected';
  const reviewFieldsLocked =
    isEditing && (channel.status === 'active' || channel.status === 'offline');
  const dialogDescriptionKey = isResubmitting
    ? 'resubmitDescription'
    : reviewFieldsLocked
      ? 'approvedEditDescription'
      : isEditing
        ? 'editDescription'
        : 'createDescription';
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
    disabled ||
    reviewFieldsLocked ||
    selectableProviders.length === 0 ||
    (providerStatus !== 'ready' && !isEditing);
  const submitDisabled =
    disabled || discoveryState === 'loading' || (providerStatus !== 'ready' && !isEditing);
  const selectedProviderName =
    selectableProviders.find((provider) => provider.id === providerId)?.name ?? providerId;
  const canDiscover =
    providerId.length > 0 &&
    normalizeHttpsUrl(baseUrl) !== null &&
    (apiKey.trim().length > 0 || channel?.apiKeyConfigured === true);

  async function handleDiscoverModels() {
    const normalizedBaseUrl = normalizeHttpsUrl(baseUrl);
    const normalizedApiKey = apiKey.trim();
    setProviderError(providerId ? null : 'required');
    setBaseUrlError(normalizedBaseUrl === null);
    setApiKeyError(!normalizedApiKey && !channel?.apiKeyConfigured);
    if (
      !providerId ||
      normalizedBaseUrl === null ||
      (!normalizedApiKey && !channel?.apiKeyConfigured)
    ) {
      return;
    }

    setDiscoveryState('loading');
    try {
      const models = await discoverMerchantChannelModels({
        apiKey: normalizedApiKey || undefined,
        baseUrl: normalizedBaseUrl,
        channelId: channel?.id,
        providerId,
      });
      setAvailableModels(models);
      setSupportedModels(models);
      setModelsError(false);
      setDiscoveryState('ready');
    } catch (error: unknown) {
      setDiscoveryErrorKey(resolveDiscoveryErrorKey(error));
      setDiscoveryState('error');
    }
  }

  function addManualModel() {
    const model = manualModel.trim();
    if (!model || model.length > 200) return;
    setAvailableModels((current) => mergeModelOptions(current, [model]));
    setSupportedModels((current) => mergeModelOptions(current, [model]));
    setManualModel('');
    setModelsError(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-3xl"
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
                {t(`${translationPath}.${dialogDescriptionKey}`)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
            {isResubmitting && channel.reviewNote ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-4">
                <strong className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle aria-hidden="true" className="size-4" />
                  {t(`${translationPath}.reviewNoteTitle`)}
                </strong>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {channel.reviewNote}
                </p>
              </div>
            ) : null}

            {isEditing ? <ChannelHealthSummary channel={channel} /> : null}

            {reviewFieldsLocked ? (
              <div
                className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/6 px-3 py-2.5 text-sm leading-6 text-muted-foreground"
                role="status"
              >
                <LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                <span>{t(`${translationPath}.reviewFieldsLocked`)}</span>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-name`}>{t(`${translationPath}.fields.name.label`)}</Label>
              <Input
                aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
                aria-invalid={nameError ? true : undefined}
                autoComplete="off"
                autoFocus={!reviewFieldsLocked}
                disabled={disabled || reviewFieldsLocked}
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
              {reviewFieldsLocked ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t(`${translationPath}.fields.lockedHint`)}
                </p>
              ) : providerStatus === 'loading' && !isEditing ? (
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <Label htmlFor={`${fieldId}-base-url`}>
                  {t(`${translationPath}.fields.baseUrl.label`)}
                </Label>
                <Input
                  aria-describedby={`${fieldId}-base-url-hint${baseUrlError ? ` ${fieldId}-base-url-error` : ''}`}
                  aria-invalid={baseUrlError || undefined}
                  autoComplete="url"
                  id={`${fieldId}-base-url`}
                  maxLength={2048}
                  name="baseUrl"
                  onChange={(event) => {
                    setBaseUrl(event.target.value);
                    setBaseUrlError(false);
                    setDiscoveryState('idle');
                  }}
                  placeholder={t(`${translationPath}.fields.baseUrl.placeholder`)}
                  required
                  type="url"
                  value={baseUrl}
                />
                <p
                  className="text-xs leading-5 text-muted-foreground"
                  id={`${fieldId}-base-url-hint`}
                >
                  {t(`${translationPath}.fields.baseUrl.hint`)}
                </p>
                {baseUrlError ? (
                  <p
                    className="text-xs text-destructive"
                    id={`${fieldId}-base-url-error`}
                    role="alert"
                  >
                    {t(`${translationPath}.errors.baseUrl`)}
                  </p>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor={`${fieldId}-api-key`}>
                  {t(`${translationPath}.fields.apiKey.label`)}
                </Label>
                <Input
                  aria-describedby={`${fieldId}-api-key-hint${apiKeyError ? ` ${fieldId}-api-key-error` : ''}`}
                  aria-invalid={apiKeyError || undefined}
                  autoComplete="new-password"
                  id={`${fieldId}-api-key`}
                  maxLength={4096}
                  name="apiKey"
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setApiKeyError(false);
                    setDiscoveryState('idle');
                  }}
                  placeholder={t(
                    `${translationPath}.fields.apiKey.${channel?.apiKeyConfigured ? 'configuredPlaceholder' : 'placeholder'}`,
                  )}
                  required={!channel?.apiKeyConfigured}
                  spellCheck={false}
                  type="password"
                  value={apiKey}
                />
                <p
                  className="text-xs leading-5 text-muted-foreground"
                  id={`${fieldId}-api-key-hint`}
                >
                  {t(
                    `${translationPath}.fields.apiKey.${channel?.apiKeyConfigured ? 'configuredHint' : 'hint'}`,
                  )}
                </p>
                {apiKeyError ? (
                  <p
                    className="text-xs text-destructive"
                    id={`${fieldId}-api-key-error`}
                    role="alert"
                  >
                    {t(`${translationPath}.errors.apiKey`)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${fieldId}-description`}>
                {t(`${translationPath}.fields.description.label`)}
              </Label>
              <Textarea
                aria-describedby={`${fieldId}-description-hint${descriptionError ? ` ${fieldId}-description-error` : ''}`}
                aria-invalid={descriptionError || undefined}
                disabled={disabled || reviewFieldsLocked}
                id={`${fieldId}-description`}
                maxLength={500}
                name="description"
                onChange={(event) => {
                  setDescription(event.target.value);
                  setDescriptionError(false);
                }}
                placeholder={t(`${translationPath}.fields.description.placeholder`)}
                rows={3}
                value={description}
              />
              <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                <p id={`${fieldId}-description-hint`}>
                  {t(`${translationPath}.fields.description.hint`)}
                </p>
                <span className="shrink-0 font-mono">{description.length}/500</span>
              </div>
              {descriptionError ? (
                <p
                  className="text-xs text-destructive"
                  id={`${fieldId}-description-error`}
                  role="alert"
                >
                  {t(`${translationPath}.errors.description`)}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label htmlFor={`${fieldId}-models-search`}>
                    {t(`${translationPath}.fields.models.label`)}
                  </Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t(`${translationPath}.fields.models.hint`)}
                  </p>
                </div>
                <Button
                  className="sm:self-start"
                  disabled={!canDiscover || disabled || discoveryState === 'loading'}
                  onClick={() => void handleDiscoverModels()}
                  type="button"
                >
                  {discoveryState === 'loading' ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  {t(`${translationPath}.fields.models.discover`)}
                </Button>
              </div>

              {availableModels.length > 0 ? (
                <>
                  <MerchantChannelModelSelector
                    aria-describedby={modelsError ? `${fieldId}-models-error` : undefined}
                    aria-invalid={modelsError || undefined}
                    availableModels={availableModels}
                    disabled={disabled}
                    emptyText={t(`${translationPath}.fields.models.emptySearch`)}
                    id={`${fieldId}-models`}
                    onValueChange={(models) => {
                      setSupportedModels(models);
                      setModelsError(false);
                    }}
                    providerName={selectedProviderName}
                    searchPlaceholder={t(`${translationPath}.fields.models.searchPlaceholder`)}
                    selectionSummary={t(`${translationPath}.fields.models.summary`, {
                      available: availableModels.length,
                      selected: supportedModels.length,
                    })}
                    toggleAllLabel={t(`${translationPath}.fields.models.toggleAll`)}
                    value={supportedModels}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={disabled || supportedModels.length === availableModels.length}
                      onClick={() => {
                        setSupportedModels(availableModels);
                        setModelsError(false);
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {t(`${translationPath}.fields.models.selectAll`)}
                    </Button>
                    <Button
                      disabled={disabled}
                      onClick={() => {
                        const selected = new Set(supportedModels);
                        setSupportedModels(availableModels.filter((model) => !selected.has(model)));
                        setModelsError(false);
                      }}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {t(`${translationPath}.fields.models.invert`)}
                    </Button>
                    <Button
                      disabled={disabled || supportedModels.length === 0}
                      onClick={() => setSupportedModels([])}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      {t(`${translationPath}.fields.models.clear`)}
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground"
                  id={`${fieldId}-models`}
                >
                  {t(`${translationPath}.fields.models.empty`)}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label={t(`${translationPath}.fields.models.manualLabel`)}
                  disabled={disabled}
                  maxLength={200}
                  onChange={(event) => setManualModel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addManualModel();
                  }}
                  placeholder={t(`${translationPath}.fields.models.manualPlaceholder`)}
                  value={manualModel}
                />
                <Button
                  disabled={disabled || manualModel.trim().length === 0}
                  onClick={addManualModel}
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" />
                  {t(`${translationPath}.fields.models.manualAdd`)}
                </Button>
              </div>

              {discoveryState === 'ready' ? (
                <p className="text-xs text-success" role="status">
                  {t(`${translationPath}.fields.models.discovered`, {
                    count: availableModels.length,
                  })}
                </p>
              ) : discoveryState === 'error' ? (
                <p className="flex items-center gap-2 text-xs text-destructive" role="alert">
                  <AlertCircle aria-hidden="true" className="size-3.5" />
                  {t(`${translationPath}.fields.models.discoveryErrors.${discoveryErrorKey}`)}
                </p>
              ) : null}
              {modelsError ? (
                <p className="text-xs text-destructive" id={`${fieldId}-models-error`} role="alert">
                  {t(`${translationPath}.errors.models`)}
                </p>
              ) : null}
            </div>

            {isEditing && (channel.status === 'active' || channel.status === 'offline') ? (
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
            ) : isEditing ? (
              <div className="grid gap-2">
                <Label>{t(`${translationPath}.fields.status.label`)}</Label>
                <div className="flex min-h-10 items-center">
                  <MerchantStatusBadge namespace="channels" status={channel.status} />
                </div>
              </div>
            ) : null}
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
                ) : isResubmitting ? (
                  <RadioTower aria-hidden="true" />
                ) : isEditing ? (
                  <Save aria-hidden="true" />
                ) : (
                  <RadioTower aria-hidden="true" />
                )}
                {t(
                  `${translationPath}.${isResubmitting ? 'resubmit' : isEditing ? 'save' : 'create'}`,
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function normalizeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname.toLocaleLowerCase() === 'localhost' ||
      url.hostname.toLocaleLowerCase().endsWith('.localhost')
    ) {
      return null;
    }
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function resolveDiscoveryErrorKey(error: unknown): string {
  return error instanceof ApiError &&
    error.code === API_ERROR_CODE.MERCHANT_CHANNEL_CREDENTIALS_REJECTED
    ? 'credentials'
    : error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_MERCHANT_CHANNEL
      ? 'invalid'
      : 'connection';
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
