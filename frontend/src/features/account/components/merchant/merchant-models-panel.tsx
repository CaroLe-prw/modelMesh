import { Boxes, PauseCircle, PlayCircle, Plus, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ManagementList,
  type ManagementListColumn,
  type ManagementListState,
} from '@/components/common/management-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listMerchantChannels,
  type MerchantChannel,
} from '@/features/account/api/merchant-channels';
import {
  clearMerchantModelOptionsCache,
  createMerchantModel,
  deleteMerchantModel,
  listMerchantModels,
  preloadMerchantModelOptions,
  updateMerchantModel,
  updateMerchantModelStatus,
  type MerchantModel,
  type MerchantModelDraft,
  type MerchantModelReviewStatus,
  type MerchantModelStatus,
} from '@/features/account/api/merchant-models';
import { MerchantModelDialog } from '@/features/account/components/merchant/merchant-model-dialog';
import {
  formatMerchantCurrency,
  formatMerchantDate,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { cn } from '@/lib/utils';

type ModelStatusFilter = 'all' | MerchantModelStatus;
type ModelReviewStatusFilter = 'all' | MerchantModelReviewStatus;
const modelStatusFilters: ModelStatusFilter[] = ['all', 'published', 'offline'];
const modelReviewStatusFilters: ModelReviewStatusFilter[] = [
  'all',
  'pending',
  'approved',
  'rejected',
];

function merchantModelErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case API_ERROR_CODE.INVALID_MERCHANT_MODEL:
      return 'pages.account.sections.merchant.models.feedback.invalid';
    case API_ERROR_CODE.MERCHANT_MODEL_ALREADY_EXISTS:
      return 'pages.account.sections.merchant.models.feedback.duplicate';
    case API_ERROR_CODE.MERCHANT_MODEL_NOT_FOUND:
      return 'pages.account.sections.merchant.models.feedback.notFound';
    case API_ERROR_CODE.MERCHANT_MODEL_PROVIDER_MISMATCH:
      return 'pages.account.sections.merchant.models.feedback.providerMismatch';
    case API_ERROR_CODE.MERCHANT_MODEL_PRICE_SETTINGS_CHANGED:
      return 'pages.account.sections.merchant.models.feedback.priceSettingsChanged';
    case API_ERROR_CODE.MERCHANT_CHANNEL_NOT_FOUND:
      return 'pages.account.sections.merchant.models.feedback.channelNotFound';
    case API_ERROR_CODE.MERCHANT_CHANNEL_PENDING_REVIEW:
      return 'pages.account.sections.merchant.models.feedback.channelPendingReview';
    case API_ERROR_CODE.MODEL_NOT_FOUND:
      return 'pages.account.sections.merchant.models.feedback.modelNotFound';
    default:
      return fallback;
  }
}

export function MerchantModelsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [models, setModels] = useState<MerchantModel[]>([]);
  const [channels, setChannels] = useState<MerchantChannel[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ModelStatusFilter>('all');
  const [reviewStatus, setReviewStatus] = useState<ModelReviewStatusFilter>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<MerchantModel | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    const channelsRequest = listMerchantChannels(controller.signal).then((channelItems) => {
      const approvedChannels = channelItems.filter(
        (channel) => channel.status === 'active' || channel.status === 'offline',
      );
      preloadMerchantModelOptions(approvedChannels.map((channel) => channel.id));
      return approvedChannels;
    });
    void Promise.all([listMerchantModels(controller.signal), channelsRequest])
      .then(([modelItems, channelItems]) => {
        if (!active) return;
        setModels(modelItems);
        setChannels(channelItems);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion, setGuest]);

  useEffect(() => {
    if (channels.length === 0) return;
    preloadMerchantModelOptions(channels.map((channel) => channel.id));
  }, [channels]);

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return models.filter((model) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        model.modelIdentifier.toLocaleLowerCase().includes(normalizedQuery) ||
        model.modelName.toLocaleLowerCase().includes(normalizedQuery) ||
        model.channelName.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (status === 'all' || model.status === status) &&
        (reviewStatus === 'all' || model.reviewStatus === reviewStatus)
      );
    });
  }, [models, query, reviewStatus, status]);

  const handleUnauthenticated = useCallback(() => setGuest(), [setGuest]);

  function reload() {
    clearMerchantModelOptionsCache();
    setRefreshVersion((version) => version + 1);
  }

  function openCreateDialog() {
    setEditingModel(null);
    setEditorOpen(true);
  }

  function openManageDialog(model: MerchantModel) {
    setEditingModel(model);
    setEditorOpen(true);
  }

  async function handleSave(draft: MerchantModelDraft): Promise<void> {
    setIsMutating(true);
    try {
      if (editingModel) {
        const updated = await updateMerchantModel(editingModel.id, draft);
        setModels((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success(
          t(
            updated.pendingPrice && updated.reviewStatus === 'pending'
              ? 'pages.account.sections.merchant.models.feedback.priceReviewSubmitted'
              : updated.reviewStatus === 'pending'
                ? 'pages.account.sections.merchant.models.feedback.resubmitted'
                : 'pages.account.sections.merchant.models.feedback.priceUpdated',
          ),
        );
      } else {
        const created = await createMerchantModel(draft);
        setModels((current) => [created, ...current]);
        clearMerchantModelOptionsCache();
        toast.success(t('pages.account.sections.merchant.models.feedback.created'));
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantModelErrorKey(
            error,
            editingModel
              ? 'pages.account.sections.merchant.models.feedback.updateError'
              : 'pages.account.sections.merchant.models.feedback.createError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDelete(model: MerchantModel): Promise<void> {
    setIsMutating(true);
    try {
      await deleteMerchantModel(model.id);
      setModels((current) => current.filter((item) => item.id !== model.id));
      clearMerchantModelOptionsCache();
      toast.success(t('pages.account.sections.merchant.models.feedback.deleted'));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantModelErrorKey(
            error,
            'pages.account.sections.merchant.models.feedback.deleteError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleToggleStatus(model: MerchantModel): Promise<void> {
    const nextStatus = model.status === 'offline' ? 'published' : 'offline';
    setIsMutating(true);
    try {
      const updated = await updateMerchantModelStatus(model.id, nextStatus);
      setModels((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(
        t(
          nextStatus === 'published'
            ? 'pages.account.sections.merchant.models.feedback.published'
            : 'pages.account.sections.merchant.models.feedback.unpublished',
        ),
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantModelErrorKey(
            error,
            'pages.account.sections.merchant.models.feedback.statusUpdateError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  const initialLoading = isLoading && models.length === 0;
  const listState: ManagementListState = initialLoading
    ? {
        label: t('pages.account.sections.merchant.models.loading'),
        status: 'loading',
      }
    : loadError
      ? {
          label: t('pages.account.sections.merchant.models.loadError'),
          onRetry: reload,
          retryLabel: t('pages.account.sections.merchant.models.retry'),
          status: 'error',
        }
      : { status: 'ready' };
  const columns: ManagementListColumn<MerchantModel>[] = [
    {
      className: 'min-w-48 px-4',
      hideable: false,
      key: 'model',
      label: t('pages.account.sections.merchant.models.columns.model'),
      mobile: false,
      render: (model) => (
        <div className="min-w-0">
          <strong className="block truncate font-mono text-xs">{model.modelIdentifier}</strong>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {model.modelName}
          </span>
        </div>
      ),
    },
    {
      className: 'min-w-44 text-xs text-muted-foreground',
      hideable: false,
      key: 'channel',
      label: t('pages.account.sections.merchant.models.columns.channel'),
      mobile: false,
      render: (model) => model.channelName,
    },
    {
      className: 'font-mono',
      key: 'context',
      label: t('pages.account.sections.merchant.models.columns.context'),
      render: (model) => formatContextWindow(model.contextWindow),
    },
    {
      key: 'billingMode',
      label: t('pages.account.sections.merchant.models.columns.billingMode'),
      render: (model) => (
        <div className="grid justify-items-start gap-1">
          <Badge variant="secondary">
            {t(`pages.account.sections.merchant.models.billingModes.${model.billingMode}`)}
          </Badge>
          {model.pendingPrice && model.pendingPrice.billingMode !== model.billingMode ? (
            <span className="text-[10px] text-warning">
              →{' '}
              {t(
                `pages.account.sections.merchant.models.billingModes.${model.pendingPrice.billingMode}`,
              )}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      className: 'font-mono text-xs',
      key: 'inputPrice',
      label: t('pages.account.sections.merchant.models.columns.inputPrice'),
      render: (model) =>
        model.billingMode === 'token' ? (
          <ModelPriceCell kind="input" language={i18n.resolvedLanguage} model={model} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      className: 'font-mono text-xs',
      key: 'outputPrice',
      label: t('pages.account.sections.merchant.models.columns.outputPrice'),
      render: (model) =>
        model.billingMode === 'token' ? (
          <ModelPriceCell kind="output" language={i18n.resolvedLanguage} model={model} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      className: 'min-w-48 font-mono text-xs',
      key: 'requestPrices',
      label: t('pages.account.sections.merchant.models.columns.requestPrices'),
      render: (model) =>
        model.billingMode === 'request' || model.pendingPrice?.billingMode === 'request' ? (
          <RequestPriceSummary language={i18n.resolvedLanguage} model={model} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.merchant.models.columns.status'),
      render: (model) => <MerchantStatusBadge namespace="models" status={model.status} />,
    },
    {
      key: 'reviewStatus',
      label: t('pages.account.sections.merchant.models.columns.reviewStatus'),
      render: (model) => <MerchantStatusBadge namespace="models" status={model.reviewStatus} />,
    },
    {
      className: 'min-w-56',
      hideable: false,
      key: 'reviewIssue',
      label: t('pages.account.sections.merchant.models.columns.reviewIssue'),
      mobile: { className: 'col-span-2' },
      render: (model) =>
        model.reviewStatus === 'rejected' && model.reviewNote ? (
          <span className="block whitespace-normal text-xs leading-5 text-destructive">
            {model.reviewNote}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      className: 'min-w-44 font-mono text-xs text-muted-foreground',
      key: 'updatedAt',
      label: t('pages.account.sections.merchant.models.columns.updatedAt'),
      render: (model) => formatMerchantDate(i18n.resolvedLanguage, model.updatedAt),
    },
    {
      className: 'w-36 min-w-36 text-center',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.merchant.models.columns.actions'),
      mobile: false,
      render: (model) => (
        <ModelActions
          disabled={isMutating}
          model={model}
          onManage={openManageDialog}
          onToggleStatus={(item) => void handleToggleStatus(item)}
        />
      ),
    },
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <ManagementList
        caption={t('pages.account.sections.merchant.models.caption')}
        columns={columns}
        disabled={isMutating}
        emptyIcon={Boxes}
        emptyText={t('pages.account.sections.merchant.models.empty')}
        items={visibleModels}
        mobileHeader={(model) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate font-mono text-sm">{model.modelIdentifier}</strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {model.channelName}
              </span>
            </div>
            <ModelActions
              disabled={isMutating}
              model={model}
              onManage={openManageDialog}
              onToggleStatus={(item) => void handleToggleStatus(item)}
            />
          </div>
        )}
        rowKey="id"
        selection={false}
        state={listState}
        toolbar={{
          filters: (
            <div className="grid w-full gap-2 sm:grid-cols-2 md:flex md:w-auto">
              <Select
                disabled={isMutating}
                onValueChange={(value) => setStatus(value as ModelStatusFilter)}
                value={status}
              >
                <SelectTrigger
                  aria-label={t('pages.account.sections.merchant.models.statusFilter')}
                  className="w-full md:w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelStatusFilters.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`pages.account.sections.merchant.models.statuses.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                disabled={isMutating}
                onValueChange={(value) => setReviewStatus(value as ModelReviewStatusFilter)}
                value={reviewStatus}
              >
                <SelectTrigger
                  aria-label={t('pages.account.sections.merchant.models.reviewStatusFilter')}
                  className="w-full md:w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelReviewStatusFilters.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`pages.account.sections.merchant.models.reviewStatuses.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ),
          isRefreshing: isLoading,
          onQueryChange: setQuery,
          onRefresh: reload,
          placeholder: t('pages.account.sections.merchant.models.search'),
          primaryAction: (
            <Button
              className="flex-1 md:flex-none"
              disabled={isMutating}
              onClick={openCreateDialog}
            >
              <Plus aria-hidden="true" />
              {t('pages.account.sections.merchant.models.add')}
            </Button>
          ),
          query,
        }}
      />

      <MerchantModelDialog
        channels={channels}
        disabled={isMutating}
        existingModels={models}
        model={editingModel}
        onDelete={handleDelete}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        onUnauthenticated={handleUnauthenticated}
        open={editorOpen}
      />
    </div>
  );
}

function RequestPriceSummary({
  language,
  model,
}: {
  language: string | undefined;
  model: MerchantModel;
}) {
  const usesPendingPrice = model.pendingPrice?.billingMode === 'request';
  const pricing = usesPendingPrice ? model.pendingPrice?.pricing : model.pricing;
  const requestPrice = pricing?.base?.request;
  return (
    <span className={cn('whitespace-nowrap', usesPendingPrice && 'text-warning')}>
      {requestPrice === undefined
        ? '—'
        : formatMerchantCurrency(language, requestPrice, model.priceCurrency)}
    </span>
  );
}

const modelActionClassName =
  'h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-muted-foreground hover:bg-primary/8 hover:text-primary';

function ModelActions({
  disabled,
  model,
  onManage,
  onToggleStatus,
}: {
  disabled: boolean;
  model: MerchantModel;
  onManage: (model: MerchantModel) => void;
  onToggleStatus: (model: MerchantModel) => void;
}) {
  const { t } = useTranslation();
  const translationPath = 'pages.account.sections.merchant.models.actions';
  const labelPath = 'pages.account.sections.merchant.models.actionLabels';
  const isOffline = model.status === 'offline';
  const statusAction = isOffline ? 'publish' : 'unpublish';

  return (
    <div className="flex items-center justify-end gap-0.5 md:justify-center">
      <Button
        aria-label={t(`${translationPath}.manage`, { name: model.modelIdentifier })}
        className={modelActionClassName}
        disabled={disabled}
        onClick={() => onManage(model)}
        title={t(`${translationPath}.manage`, { name: model.modelIdentifier })}
        type="button"
        variant="ghost"
      >
        <SlidersHorizontal aria-hidden="true" />
        <span className="text-[11px] leading-none">{t(`${labelPath}.manage`)}</span>
      </Button>

      {model.hasApprovedPrice ? (
        <Button
          aria-label={t(`${translationPath}.${statusAction}`, { name: model.modelIdentifier })}
          className={modelActionClassName}
          disabled={disabled}
          onClick={() => onToggleStatus(model)}
          title={t(`${translationPath}.${statusAction}`, { name: model.modelIdentifier })}
          type="button"
          variant="ghost"
        >
          {isOffline ? <PlayCircle aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
          <span className="text-[11px] leading-none">{t(`${labelPath}.${statusAction}`)}</span>
        </Button>
      ) : null}
    </div>
  );
}

function ModelPriceCell({
  kind,
  language,
  model,
}: {
  kind: 'input' | 'output';
  language: string | undefined;
  model: MerchantModel;
}) {
  const { t } = useTranslation();
  const current = kind === 'input' ? model.inputPrice : model.outputPrice;
  const pending =
    model.pendingPrice?.billingMode === 'token'
      ? kind === 'input'
        ? model.pendingPrice.inputPrice
        : model.pendingPrice.outputPrice
      : null;

  return (
    <div className="min-w-28">
      <span className="block font-mono text-xs">
        {formatMerchantCurrency(language, current, model.priceCurrency)}
      </span>
      {pending === null || !model.pendingPrice ? null : (
        <span className="mt-1 block whitespace-normal text-[11px] leading-4 text-warning">
          {t(
            model.pendingPrice.effectiveAt
              ? 'pages.account.sections.merchant.models.priceChange.scheduled'
              : model.reviewStatus === 'rejected'
                ? 'pages.account.sections.merchant.models.priceChange.rejected'
                : 'pages.account.sections.merchant.models.priceChange.pending',
            {
              date: model.pendingPrice.effectiveAt
                ? formatMerchantDate(language, model.pendingPrice.effectiveAt)
                : '',
              price: formatMerchantCurrency(language, pending, model.pendingPrice.priceCurrency),
            },
          )}
        </span>
      )}
    </div>
  );
}

function formatContextWindow(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(2))}K`;
  return String(value);
}
