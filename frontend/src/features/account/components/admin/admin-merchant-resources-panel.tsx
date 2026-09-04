import { Boxes, Eye, PauseCircle, PlayCircle, RadioTower, ScrollText } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ManagementList,
  type ManagementListColumn,
  type ManagementListState,
} from '@/components/common/management-list';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listAdminMerchantChannels,
  getAdminMerchantChannelLatestOperation,
  getAdminMerchantModelLatestOperation,
  listAdminMerchantModelLogs,
  listAdminMerchantModels,
  updateAdminMerchantChannelStatus,
  updateAdminMerchantModelStatus,
} from '@/features/account/api/admin-merchant-resources';
import {
  adminMerchantResourceUrl,
  type AdminMerchantResourceView,
} from '@/features/account/components/admin/admin-merchant-resource-navigation';
import type { MerchantChannel } from '@/features/account/api/merchant-channels';
import type { MerchantChannelControlStatus } from '@/features/account/api/merchant-channels';
import type {
  MerchantModel,
  MerchantModelRuntimeStatus,
} from '@/features/account/api/merchant-models';
import type {
  ListMerchantRequestsQuery,
  MerchantRequest,
  MerchantRequestStatus,
} from '@/features/account/api/merchant-requests';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { AdminListActionButton } from '@/features/account/components/admin/admin-list-action-button';
import {
  merchantModelPricingViews,
  type MerchantModelPricingView,
} from '@/features/account/components/admin/admin-merchant-model-pricing';
import { isMerchantModelRoutable } from '@/features/account/components/admin/admin-merchant-resource-state';
import {
  modelPricingGroups,
  orderedRateNames,
  priceGroupTitle,
  type PriceGroupView,
} from '@/features/account/components/admin/model-pricing';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
  type PaginatedResponse,
} from '@/lib/pagination';

const resourceViews: AdminMerchantResourceView[] = ['channels', 'models', 'modelLogs'];

export interface AdminMerchantResourceLoaders {
  channels: (merchantId: number, signal?: AbortSignal) => Promise<MerchantChannel[]>;
  channelLatestOperation: (
    merchantId: number,
    channelId: string,
    signal?: AbortSignal,
  ) => Promise<MerchantRequest | null>;
  modelLogs: (
    merchantId: number,
    query: ListMerchantRequestsQuery,
    signal?: AbortSignal,
  ) => Promise<PaginatedResponse<MerchantRequest>>;
  models: (merchantId: number, signal?: AbortSignal) => Promise<MerchantModel[]>;
  modelLatestOperation: (
    merchantId: number,
    listingId: string,
    signal?: AbortSignal,
  ) => Promise<MerchantRequest | null>;
  updateChannelStatus: (
    merchantId: number,
    channelId: string,
    status: MerchantChannelControlStatus,
    reason: string,
  ) => Promise<MerchantChannel>;
  updateModelStatus: (
    merchantId: number,
    listingId: string,
    status: MerchantModelRuntimeStatus,
    reason: string,
  ) => Promise<MerchantModel>;
}

const defaultLoaders: AdminMerchantResourceLoaders = {
  channels: listAdminMerchantChannels,
  channelLatestOperation: getAdminMerchantChannelLatestOperation,
  modelLogs: listAdminMerchantModelLogs,
  modelLatestOperation: getAdminMerchantModelLatestOperation,
  models: listAdminMerchantModels,
  updateChannelStatus: updateAdminMerchantChannelStatus,
  updateModelStatus: updateAdminMerchantModelStatus,
};

export function AdminMerchantResourcesPanel({
  merchantId,
  resource,
  loaders = defaultLoaders,
}: {
  merchantId: number;
  resource: AdminMerchantResourceView;
  loaders?: AdminMerchantResourceLoaders;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4">
      <nav
        aria-label={t('pages.account.sections.admin.merchantResources.navigation')}
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        {resourceViews.map((view) => (
          <Button asChild key={view} variant={resource === view ? 'secondary' : 'ghost'}>
            <Link to={adminMerchantResourceUrl(merchantId, view)}>
              {t(`pages.account.sections.admin.merchantResources.tabs.${view}`)}
            </Link>
          </Button>
        ))}
      </nav>

      {resource === 'channels' ? (
        <AdminMerchantChannels
          loadLatestOperation={loaders.channelLatestOperation}
          loader={loaders.channels}
          merchantId={merchantId}
          updateStatus={loaders.updateChannelStatus}
        />
      ) : resource === 'models' ? (
        <AdminMerchantModels
          loadLatestOperation={loaders.modelLatestOperation}
          loader={loaders.models}
          merchantId={merchantId}
          updateStatus={loaders.updateModelStatus}
        />
      ) : (
        <AdminMerchantModelLogs loader={loaders.modelLogs} merchantId={merchantId} />
      )}
    </div>
  );
}

function AdminMerchantChannels({
  loadLatestOperation,
  loader,
  merchantId,
  updateStatus,
}: {
  loadLatestOperation: AdminMerchantResourceLoaders['channelLatestOperation'];
  loader: AdminMerchantResourceLoaders['channels'];
  merchantId: number;
  updateStatus: AdminMerchantResourceLoaders['updateChannelStatus'];
}) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const { items, loadError, loading, query, reload, setItems, setQuery } =
    useAdminMerchantCollection(merchantId, loader);
  const [statusTarget, setStatusTarget] = useState<MerchantChannel | null>(null);
  const [detailTarget, setDetailTarget] = useState<MerchantChannel | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter(
      (channel) =>
        normalizedQuery.length === 0 ||
        String(channel.channelId).includes(normalizedQuery) ||
        channel.name.toLocaleLowerCase().includes(normalizedQuery) ||
        channel.provider.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);
  const columns: ManagementListColumn<MerchantChannel>[] = [
    {
      className: 'min-w-56 px-4',
      hideable: false,
      key: 'channel',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.channel'),
      mobile: false,
      render: (channel) => (
        <div className="min-w-0">
          <strong className="block truncate text-sm">{channel.name}</strong>
          <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
            {t('pages.account.sections.admin.merchantResources.publicId', {
              id: channel.channelId,
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'provider',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.provider'),
      render: (channel) => channel.provider,
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.status'),
      render: (channel) => <MerchantStatusBadge namespace="channels" status={channel.status} />,
    },
    {
      className: 'font-mono',
      key: 'models',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.models'),
      render: (channel) => channel.modelCount.toLocaleString(i18n.resolvedLanguage),
    },
    {
      className: 'font-mono',
      key: 'successRate',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.successRate'),
      render: (channel) => (channel.successRate > 0 ? `${channel.successRate}%` : '—'),
    },
    {
      className: 'font-mono',
      key: 'latency',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.latency'),
      render: (channel) => (channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—'),
    },
    {
      className: 'min-w-44 font-mono text-xs text-muted-foreground',
      key: 'updatedAt',
      label: t('pages.account.sections.admin.merchantResources.channels.columns.updatedAt'),
      render: (channel) => formatMerchantDate(i18n.resolvedLanguage, channel.updatedAt),
    },
    {
      className: 'w-32 min-w-32 text-center',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.merchantResources.actions.column'),
      mobile: false,
      render: (channel) => (
        <div className="flex items-center justify-center gap-1">
          <AdminListActionButton
            disabled={mutatingId !== null}
            icon={Eye}
            label={t('pages.account.sections.admin.merchantResources.channels.details.action')}
            onClick={() => setDetailTarget(channel)}
          />
          <ResourceStatusButton
            disabled={mutatingId !== null || !['active', 'offline'].includes(channel.status)}
            kind="channel"
            offline={channel.status === 'offline'}
            onClick={() => setStatusTarget(channel)}
          />
        </div>
      ),
    },
  ];

  async function confirmStatusChange(reason: string) {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === 'active' ? 'offline' : 'active';
    setMutatingId(statusTarget.id);
    try {
      const updated = await updateStatus(merchantId, statusTarget.id, nextStatus, reason);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusTarget(null);
      toast.success(
        t(`pages.account.sections.admin.merchantResources.feedback.channel.${nextStatus}`),
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(t('pages.account.sections.admin.merchantResources.feedback.statusFailed'));
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <>
      <ManagementList
        caption={t('pages.account.sections.admin.merchantResources.channels.caption')}
        columns={columns}
        disabled={mutatingId !== null}
        emptyIcon={RadioTower}
        emptyText={t('pages.account.sections.admin.merchantResources.channels.empty')}
        items={visibleItems}
        mobileHeader={(channel) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{channel.name}</strong>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {t('pages.account.sections.admin.merchantResources.publicId', {
                  id: channel.channelId,
                })}
              </span>
            </div>
            <div className="grid shrink-0 justify-items-end gap-2">
              <MerchantStatusBadge namespace="channels" status={channel.status} />
              <div className="flex items-center gap-1">
                <AdminListActionButton
                  disabled={mutatingId !== null}
                  icon={Eye}
                  label={t(
                    'pages.account.sections.admin.merchantResources.channels.details.action',
                  )}
                  onClick={() => setDetailTarget(channel)}
                />
                <ResourceStatusButton
                  disabled={mutatingId !== null || !['active', 'offline'].includes(channel.status)}
                  kind="channel"
                  offline={channel.status === 'offline'}
                  onClick={() => setStatusTarget(channel)}
                />
              </div>
            </div>
          </div>
        )}
        rowKey="id"
        selection={false}
        state={resourceListState(
          loading,
          loadError,
          reload,
          t('pages.account.sections.admin.merchantResources.channels.loading'),
          t('pages.account.sections.admin.merchantResources.loadError'),
          t('pages.account.sections.admin.merchantResources.retry'),
        )}
        toolbar={{
          isRefreshing: loading,
          onQueryChange: setQuery,
          onRefresh: reload,
          placeholder: t('pages.account.sections.admin.merchantResources.channels.search'),
          query,
        }}
      />
      <ResourceStatusDialog
        kind="channel"
        loading={mutatingId !== null}
        name={statusTarget?.name ?? ''}
        offline={statusTarget?.status === 'offline'}
        onConfirm={(reason) => void confirmStatusChange(reason)}
        onOpenChange={(open) => {
          if (!open && mutatingId === null) setStatusTarget(null);
        }}
        open={statusTarget !== null}
      />
      <AdminMerchantChannelDetailsDialog
        channel={detailTarget}
        loadLatestOperation={loadLatestOperation}
        merchantId={merchantId}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
      />
    </>
  );
}

function AdminMerchantChannelDetailsDialog({
  channel,
  loadLatestOperation,
  merchantId,
  onOpenChange,
}: {
  channel: MerchantChannel | null;
  loadLatestOperation: AdminMerchantResourceLoaders['channelLatestOperation'];
  merchantId: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [operation, setOperation] = useState<MerchantRequest | null>(null);
  const [operationStatus, setOperationStatus] = useState<'error' | 'loading' | 'ready'>('loading');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!channel) {
      setOperation(null);
      setOperationStatus('loading');
      return;
    }
    const controller = new AbortController();
    let active = true;
    setOperationStatus('loading');
    void loadLatestOperation(merchantId, channel.id, controller.signal)
      .then((response) => {
        if (!active) return;
        setOperation(response);
        setOperationStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setOperationStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [channel, loadLatestOperation, merchantId, refreshVersion, setGuest]);

  return (
    <Dialog onOpenChange={onOpenChange} open={channel !== null}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('pages.account.sections.admin.merchantResources.channels.details.close')}
      >
        <DialogHeader>
          <DialogTitle>
            {t('pages.account.sections.admin.merchantResources.channels.details.title', {
              name: channel?.name ?? '',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.admin.merchantResources.channels.details.description', {
              id: channel?.channelId ?? '',
            })}
          </DialogDescription>
        </DialogHeader>

        {channel ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.channels.details.provider',
                )}
              >
                {channel.provider}
              </ChannelDetailField>
              <ChannelDetailField
                label={t('pages.account.sections.admin.merchantResources.channels.details.status')}
              >
                <MerchantStatusBadge namespace="channels" status={channel.status} />
              </ChannelDetailField>
              <ChannelDetailField
                className="sm:col-span-2"
                label={t(
                  'pages.account.sections.admin.merchantResources.channels.details.channelDescription',
                )}
              >
                {channel.description || '—'}
              </ChannelDetailField>
              <ChannelDetailField
                className="sm:col-span-2"
                label={t('pages.account.sections.admin.merchantResources.channels.details.baseUrl')}
              >
                <span className="break-all font-mono text-xs">{channel.baseUrl}</span>
              </ChannelDetailField>
              <ChannelDetailField
                className="sm:col-span-2"
                label={t(
                  'pages.account.sections.admin.merchantResources.channels.details.supportedModels',
                )}
              >
                <div className="flex flex-wrap gap-1.5">
                  {channel.supportedModels.map((model) => (
                    <Badge key={model} variant="secondary">
                      {model}
                    </Badge>
                  ))}
                </div>
              </ChannelDetailField>
            </div>

            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">
                {t(
                  'pages.account.sections.admin.merchantResources.channels.details.latestOperation',
                )}
              </h3>
              {operationStatus === 'loading' ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(
                    'pages.account.sections.admin.merchantResources.channels.details.operationLoading',
                  )}
                </p>
              ) : operationStatus === 'error' ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-destructive">
                    {t(
                      'pages.account.sections.admin.merchantResources.channels.details.operationError',
                    )}
                  </span>
                  <Button
                    onClick={() => setRefreshVersion((version) => version + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t('pages.account.sections.admin.merchantResources.retry')}
                  </Button>
                </div>
              ) : operation ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ChannelDetailField
                    label={t(
                      'pages.account.sections.admin.merchantResources.channels.details.operationAction',
                    )}
                  >
                    {operation.action
                      ? t(
                          `pages.account.sections.admin.merchantResources.channels.details.actions.${operation.action}`,
                        )
                      : '—'}
                  </ChannelDetailField>
                  <ChannelDetailField
                    label={t(
                      'pages.account.sections.admin.merchantResources.channels.details.operator',
                    )}
                  >
                    {t(
                      `pages.account.sections.admin.merchantResources.channels.details.operatorSources.${operation.operatorSource}`,
                    )}
                    {operation.operatorUserId
                      ? ` · ${t(
                          'pages.account.sections.admin.merchantResources.channels.details.operatorId',
                          { id: operation.operatorUserId },
                        )}`
                      : ''}
                  </ChannelDetailField>
                  <ChannelDetailField
                    className="sm:col-span-2"
                    label={t(
                      'pages.account.sections.admin.merchantResources.channels.details.operationReason',
                    )}
                  >
                    {operation.operationReason ||
                      t(
                        'pages.account.sections.admin.merchantResources.channels.details.noOperationReason',
                      )}
                  </ChannelDetailField>
                  <ChannelDetailField
                    className="sm:col-span-2"
                    label={t(
                      'pages.account.sections.admin.merchantResources.channels.details.operationTime',
                    )}
                  >
                    {formatMerchantDate(i18n.resolvedLanguage, operation.submittedAt)}
                  </ChannelDetailField>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('pages.account.sections.admin.merchantResources.channels.details.noOperation')}
                </p>
              )}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('pages.account.sections.admin.merchantResources.channels.details.close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelDetailField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-background p-3 ${className ?? ''}`}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <div className="mt-1.5 text-sm leading-6">{children}</div>
    </div>
  );
}

function AdminMerchantModelDetailsDialog({
  loadLatestOperation,
  merchantId,
  model,
  onOpenChange,
}: {
  loadLatestOperation: AdminMerchantResourceLoaders['modelLatestOperation'];
  merchantId: number;
  model: MerchantModel | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [operation, setOperation] = useState<MerchantRequest | null>(null);
  const [operationStatus, setOperationStatus] = useState<'error' | 'loading' | 'ready'>('loading');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!model) {
      setOperation(null);
      setOperationStatus('loading');
      return;
    }
    const controller = new AbortController();
    let active = true;
    setOperationStatus('loading');
    void loadLatestOperation(merchantId, model.id, controller.signal)
      .then((response) => {
        if (!active) return;
        setOperation(response);
        setOperationStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setOperationStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadLatestOperation, merchantId, model, refreshVersion, setGuest]);

  return (
    <Dialog onOpenChange={onOpenChange} open={model !== null}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('pages.account.sections.admin.merchantResources.models.details.close')}
      >
        <DialogHeader>
          <DialogTitle>
            {t('pages.account.sections.admin.merchantResources.models.details.title', {
              name: model?.modelIdentifier ?? '',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.admin.merchantResources.models.details.description')}
          </DialogDescription>
        </DialogHeader>

        {model ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ChannelDetailField
                label={t('pages.account.sections.admin.merchantResources.models.details.modelName')}
              >
                <span className="font-mono">{model.modelName}</span>
              </ChannelDetailField>
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.modelIdentifier',
                )}
              >
                <span className="break-all font-mono">{model.modelIdentifier}</span>
              </ChannelDetailField>
              <ChannelDetailField
                label={t('pages.account.sections.admin.merchantResources.models.details.channel')}
              >
                {model.channelName}
              </ChannelDetailField>
              <ChannelDetailField
                label={t('pages.account.sections.admin.merchantResources.models.details.provider')}
              >
                {model.providerId}
              </ChannelDetailField>
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.billingMode',
                )}
              >
                {t(`pages.account.sections.merchant.models.billingModes.${model.billingMode}`)}
              </ChannelDetailField>
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.contextWindow',
                )}
              >
                <span className="font-mono">
                  {model.contextWindow.toLocaleString(i18n.resolvedLanguage)}
                </span>
              </ChannelDetailField>
              <MerchantModelPricingDetails model={model} />
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.runtimeStatus',
                )}
              >
                <MerchantStatusBadge namespace="models" status={model.status} />
              </ChannelDetailField>
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.reviewStatus',
                )}
              >
                <MerchantStatusBadge namespace="models" status={model.reviewStatus} />
              </ChannelDetailField>
              <ChannelDetailField
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.routingStatus',
                )}
              >
                <MerchantModelRoutingStatus model={model} />
              </ChannelDetailField>
              <ChannelDetailField
                label={t('pages.account.sections.admin.merchantResources.models.details.updatedAt')}
              >
                {formatMerchantDate(i18n.resolvedLanguage, model.updatedAt)}
              </ChannelDetailField>
              <ChannelDetailField
                className="sm:col-span-2"
                label={t(
                  'pages.account.sections.admin.merchantResources.models.details.reviewNote',
                )}
              >
                {model.reviewNote || '—'}
              </ChannelDetailField>
            </div>

            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">
                {t('pages.account.sections.admin.merchantResources.models.details.latestOperation')}
              </h3>
              {operationStatus === 'loading' ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(
                    'pages.account.sections.admin.merchantResources.models.details.operationLoading',
                  )}
                </p>
              ) : operationStatus === 'error' ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-destructive">
                    {t(
                      'pages.account.sections.admin.merchantResources.models.details.operationError',
                    )}
                  </span>
                  <Button
                    onClick={() => setRefreshVersion((version) => version + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {t('pages.account.sections.admin.merchantResources.retry')}
                  </Button>
                </div>
              ) : operation ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ChannelDetailField
                    label={t(
                      'pages.account.sections.admin.merchantResources.models.details.operationAction',
                    )}
                  >
                    {operation.action
                      ? t(
                          `pages.account.sections.admin.merchantResources.models.details.actions.${operation.action}`,
                        )
                      : '—'}
                  </ChannelDetailField>
                  <ChannelDetailField
                    label={t(
                      'pages.account.sections.admin.merchantResources.models.details.operator',
                    )}
                  >
                    {t(
                      `pages.account.sections.admin.merchantResources.models.details.operatorSources.${operation.operatorSource}`,
                    )}
                    {operation.operatorUserId
                      ? ` · ${t(
                          'pages.account.sections.admin.merchantResources.models.details.operatorId',
                          { id: operation.operatorUserId },
                        )}`
                      : ''}
                  </ChannelDetailField>
                  <ChannelDetailField
                    className="sm:col-span-2"
                    label={t(
                      'pages.account.sections.admin.merchantResources.models.details.operationReason',
                    )}
                  >
                    {operation.operationReason ||
                      t(
                        'pages.account.sections.admin.merchantResources.models.details.noOperationReason',
                      )}
                  </ChannelDetailField>
                  <ChannelDetailField
                    className="sm:col-span-2"
                    label={t(
                      'pages.account.sections.admin.merchantResources.models.details.operationTime',
                    )}
                  >
                    {formatMerchantDate(i18n.resolvedLanguage, operation.submittedAt)}
                  </ChannelDetailField>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('pages.account.sections.admin.merchantResources.models.details.noOperation')}
                </p>
              )}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('pages.account.sections.admin.merchantResources.models.details.close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MerchantModelPricingDetails({ model }: { model: MerchantModel }) {
  const { i18n, t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.merchantResources.models.details';
  const pricingViews = merchantModelPricingViews(model);

  return (
    <section className="grid gap-3 sm:col-span-2">
      {pricingViews.map((pricingView) => (
        <div className="grid gap-2" key={pricingView.kind}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {t(
                `${translationPath}.${pricingView.kind === 'current' ? 'currentPrice' : 'pendingPrice'}`,
              )}
            </h3>
            {pricingView.kind === 'pending' ? (
              <Badge className="border-warning/25 bg-warning/10 text-warning" variant="outline">
                {merchantPendingPriceStatus(model, i18n.resolvedLanguage, t)}
              </Badge>
            ) : null}
          </div>
          <MerchantModelPricingGroupList pricingView={pricingView} />
        </div>
      ))}
    </section>
  );
}

function MerchantModelPriceSummary({ model }: { model: MerchantModel }) {
  const { i18n, t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.merchantResources.models.details';
  const pricingViews = merchantModelPricingViews(model);
  const currentPricing = pricingViews[0];
  if (!currentPricing) return '—';
  const summary = merchantModelPrice(currentPricing, i18n.resolvedLanguage, t);
  const pendingPricing = pricingViews.find((view) => view.kind === 'pending');

  return (
    <div className="grid justify-items-start gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t(
              `${translationPath}.${pendingPricing ? 'priceTooltipWithChange' : 'priceTooltip'}`,
              { price: summary },
            )}
            className="h-auto border-b border-dashed border-muted-foreground/50 p-0 font-mono text-xs font-normal hover:bg-transparent hover:text-foreground"
            type="button"
            variant="ghost"
          >
            {summary}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          avoidCollisions={false}
          className="w-[min(40rem,calc(100vw-2rem))] max-w-none overflow-y-auto p-0"
          collisionPadding={16}
          side="bottom"
          sideOffset={8}
          style={{ maxHeight: 'var(--radix-tooltip-content-available-height, 24rem)' }}
        >
          <div className="grid gap-4 p-4">
            {pricingViews.map((pricingView) => (
              <section className="grid gap-2" key={pricingView.kind}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">
                    {t(
                      `${translationPath}.${pricingView.kind === 'current' ? 'currentPrice' : 'pendingPrice'}`,
                    )}
                  </strong>
                  {pricingView.kind === 'pending' ? (
                    <span className="text-xs font-medium text-warning">
                      {merchantPendingPriceStatus(model, i18n.resolvedLanguage, t)}
                    </span>
                  ) : null}
                </div>
                <MerchantModelPricingGroupList compact pricingView={pricingView} />
              </section>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
      {pendingPricing ? (
        <span className="max-w-48 whitespace-normal text-[10px] leading-4 text-warning">
          {merchantPendingPriceStatus(model, i18n.resolvedLanguage, t)}
        </span>
      ) : null}
    </div>
  );
}

function MerchantModelPricingGroupList({
  compact = false,
  pricingView,
}: {
  compact?: boolean;
  pricingView: MerchantModelPricingView;
}) {
  const { i18n, t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.merchantResources.models.details';
  const groups = modelPricingGroups(pricingView.pricing).flatMap((group) => {
    const rates = orderedRateNames(group.rates).filter(
      (rate) => typeof group.rates[rate] === 'number',
    );
    return rates.length > 0 ? [{ group, rates }] : [];
  });

  if (groups.length === 0) {
    return (
      <ChannelDetailField label={t(`${translationPath}.pricing.summary`)}>
        <span className="font-mono">
          {merchantModelPrice(pricingView, i18n.resolvedLanguage, t)}
        </span>
      </ChannelDetailField>
    );
  }

  return (
    <div className={compact ? 'grid gap-2' : 'grid gap-3'}>
      {groups.map(({ group, rates }) => {
        const perRequest = rates.includes('request');
        return (
          <div
            className={`rounded-lg border border-border bg-background ${compact ? 'p-2.5' : 'p-3'}`}
            key={group.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs sm:text-sm">
                {merchantPriceGroupTitle(group, t, translationPath)}
              </strong>
              <Badge variant="secondary">
                {t(`${translationPath}.pricing.${perRequest ? 'perRequest' : 'perMillion'}`, {
                  currency: pricingView.priceCurrency,
                })}
              </Badge>
            </div>
            <dl
              className={`mt-2 grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2'}`}
            >
              {rates.map((rate) => (
                <div className="rounded-md bg-muted/45 px-2.5 py-2" key={rate}>
                  <dt className="text-[11px] text-muted-foreground">
                    {t(`${translationPath}.pricing.rates.${rate}`, {
                      defaultValue: rate,
                    })}
                  </dt>
                  <dd className="mt-1 font-mono text-xs font-semibold">
                    {formatPrice(
                      i18n.resolvedLanguage,
                      group.rates[rate] ?? 0,
                      pricingView.priceCurrency,
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function merchantPriceGroupTitle(
  groupView: PriceGroupView,
  t: TFunction,
  translationPath: string,
): string {
  const group = groupView.group;
  if (group.type === 'experimentalMode' && group.mode === 'fast') {
    return groupView.maximumInclusive === undefined
      ? t(`${translationPath}.pricing.groups.fastMode`)
      : t(`${translationPath}.pricing.groups.fastModeUntil`, {
          maximum: formatTokenThreshold(groupView.maximumInclusive),
        });
  }
  if (group.type === 'experimentalModeTier' && group.mode === 'fast') {
    return groupView.maximumInclusive === undefined
      ? t(`${translationPath}.pricing.groups.fastModeTier`, {
          minimum: formatTokenThreshold(group.size),
        })
      : t(`${translationPath}.pricing.groups.fastModeRange`, {
          maximum: formatTokenThreshold(groupView.maximumInclusive),
          minimum: formatTokenThreshold(group.size),
        });
  }
  return priceGroupTitle(groupView, t, translationPath);
}

function formatTokenThreshold(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function AdminMerchantModels({
  loadLatestOperation,
  loader,
  merchantId,
  updateStatus,
}: {
  loadLatestOperation: AdminMerchantResourceLoaders['modelLatestOperation'];
  loader: AdminMerchantResourceLoaders['models'];
  merchantId: number;
  updateStatus: AdminMerchantResourceLoaders['updateModelStatus'];
}) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const { items, loadError, loading, query, reload, setItems, setQuery } =
    useAdminMerchantCollection(merchantId, loader);
  const [statusTarget, setStatusTarget] = useState<MerchantModel | null>(null);
  const [detailTarget, setDetailTarget] = useState<MerchantModel | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [selectedModelIdentifier, setSelectedModelIdentifier] = useState('all');
  const [selectedChannelId, setSelectedChannelId] = useState('all');
  const [selectedBillingMode, setSelectedBillingMode] = useState('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState('all');
  const modelFilterOptions = useMemo(() => {
    const models = new Map<string, MerchantModel>();
    for (const model of items) {
      if (!models.has(model.modelIdentifier)) models.set(model.modelIdentifier, model);
    }
    return [
      {
        label: t('pages.account.sections.admin.merchantResources.models.allModels'),
        value: 'all',
      },
      ...[...models.values()]
        .sort((left, right) => left.modelName.localeCompare(right.modelName))
        .map((model) => ({
          description: model.modelIdentifier,
          keywords: items
            .filter((item) => item.modelIdentifier === model.modelIdentifier)
            .map((item) => item.channelName),
          label: model.modelName,
          value: model.modelIdentifier,
        })),
    ];
  }, [items, t]);
  const activeModelIdentifier =
    selectedModelIdentifier === 'all' ||
    items.some((model) => model.modelIdentifier === selectedModelIdentifier)
      ? selectedModelIdentifier
      : 'all';
  const channelFilterOptions = useMemo(() => {
    const channels = new Map<string, MerchantModel>();
    for (const model of items) {
      if (!channels.has(model.channelId)) channels.set(model.channelId, model);
    }
    return [
      {
        label: t('pages.account.sections.admin.merchantResources.models.allChannels'),
        value: 'all',
      },
      ...[...channels.values()]
        .sort((left, right) => left.channelName.localeCompare(right.channelName))
        .map((model) => ({
          description: model.providerId,
          keywords: [model.channelId],
          label: model.channelName,
          value: model.channelId,
        })),
    ];
  }, [items, t]);
  const activeChannelId =
    selectedChannelId === 'all' || items.some((model) => model.channelId === selectedChannelId)
      ? selectedChannelId
      : 'all';
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter(
      (model) =>
        (activeModelIdentifier === 'all' || model.modelIdentifier === activeModelIdentifier) &&
        (activeChannelId === 'all' || model.channelId === activeChannelId) &&
        (selectedBillingMode === 'all' || model.billingMode === selectedBillingMode) &&
        (selectedReviewStatus === 'all' || model.reviewStatus === selectedReviewStatus) &&
        (normalizedQuery.length === 0 ||
          model.modelIdentifier.toLocaleLowerCase().includes(normalizedQuery) ||
          model.modelName.toLocaleLowerCase().includes(normalizedQuery) ||
          model.channelName.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [
    activeChannelId,
    activeModelIdentifier,
    items,
    query,
    selectedBillingMode,
    selectedReviewStatus,
  ]);
  const columns: ManagementListColumn<MerchantModel>[] = [
    {
      className: 'min-w-52 px-4',
      hideable: false,
      key: 'model',
      label: t('pages.account.sections.admin.merchantResources.models.columns.model'),
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
      className: 'min-w-44',
      hideable: false,
      key: 'channel',
      label: t('pages.account.sections.admin.merchantResources.models.columns.channel'),
      render: (model) => model.channelName,
    },
    {
      key: 'billingMode',
      label: t('pages.account.sections.admin.merchantResources.models.columns.billingMode'),
      render: (model) => (
        <Badge variant="secondary">
          {t(`pages.account.sections.merchant.models.billingModes.${model.billingMode}`)}
        </Badge>
      ),
    },
    {
      className: 'min-w-48 font-mono text-xs',
      key: 'price',
      label: t('pages.account.sections.admin.merchantResources.models.columns.price'),
      render: (model) => <MerchantModelPriceSummary model={model} />,
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.merchantResources.models.columns.status'),
      render: (model) => <MerchantStatusBadge namespace="models" status={model.status} />,
    },
    {
      key: 'reviewStatus',
      label: t('pages.account.sections.admin.merchantResources.models.columns.reviewStatus'),
      render: (model) => <MerchantStatusBadge namespace="models" status={model.reviewStatus} />,
    },
    {
      key: 'routingStatus',
      label: t('pages.account.sections.admin.merchantResources.models.columns.routingStatus'),
      render: (model) => <MerchantModelRoutingStatus model={model} />,
    },
    {
      className: 'min-w-44 font-mono text-xs text-muted-foreground',
      key: 'updatedAt',
      label: t('pages.account.sections.admin.merchantResources.models.columns.updatedAt'),
      render: (model) => formatMerchantDate(i18n.resolvedLanguage, model.updatedAt),
    },
    {
      className: 'w-32 min-w-32 text-center',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.merchantResources.actions.column'),
      mobile: false,
      render: (model) => (
        <div className="flex items-center justify-center gap-1">
          <AdminListActionButton
            disabled={mutatingId !== null}
            icon={Eye}
            label={t('pages.account.sections.admin.merchantResources.models.details.action')}
            onClick={() => setDetailTarget(model)}
          />
          <ResourceStatusButton
            disabled={
              mutatingId !== null || (model.status === 'offline' && !model.hasApprovedPrice)
            }
            kind="model"
            offline={model.status === 'offline'}
            onClick={() => setStatusTarget(model)}
          />
        </div>
      ),
    },
  ];

  async function confirmStatusChange(reason: string) {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === 'published' ? 'offline' : 'published';
    setMutatingId(statusTarget.id);
    try {
      const updated = await updateStatus(merchantId, statusTarget.id, nextStatus, reason);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusTarget(null);
      toast.success(
        t(`pages.account.sections.admin.merchantResources.feedback.model.${nextStatus}`),
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(t('pages.account.sections.admin.merchantResources.feedback.statusFailed'));
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <>
      <ManagementList
        caption={t('pages.account.sections.admin.merchantResources.models.caption')}
        columns={columns}
        disabled={mutatingId !== null}
        emptyIcon={Boxes}
        emptyText={t('pages.account.sections.admin.merchantResources.models.empty')}
        items={visibleItems}
        mobileHeader={(model) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate font-mono text-sm">{model.modelIdentifier}</strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {model.channelName}
              </span>
            </div>
            <div className="grid shrink-0 justify-items-end gap-2">
              <MerchantStatusBadge namespace="models" status={model.status} />
              <MerchantModelRoutingStatus model={model} />
              <div className="flex items-center gap-1">
                <AdminListActionButton
                  disabled={mutatingId !== null}
                  icon={Eye}
                  label={t('pages.account.sections.admin.merchantResources.models.details.action')}
                  onClick={() => setDetailTarget(model)}
                />
                <ResourceStatusButton
                  disabled={
                    mutatingId !== null || (model.status === 'offline' && !model.hasApprovedPrice)
                  }
                  kind="model"
                  offline={model.status === 'offline'}
                  onClick={() => setStatusTarget(model)}
                />
              </div>
            </div>
          </div>
        )}
        rowKey="id"
        selection={false}
        state={resourceListState(
          loading,
          loadError,
          reload,
          t('pages.account.sections.admin.merchantResources.models.loading'),
          t('pages.account.sections.admin.merchantResources.loadError'),
          t('pages.account.sections.admin.merchantResources.retry'),
        )}
        toolbar={{
          filters: (
            <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto xl:flex">
              <SearchableSelect
                className="w-full xl:w-48"
                disabled={mutatingId !== null}
                emptyText={t(
                  'pages.account.sections.admin.merchantResources.models.modelSearchEmpty',
                )}
                id={`admin-merchant-${merchantId}-model-filter`}
                loading={loading}
                loadingText={t('pages.account.sections.admin.merchantResources.models.loading')}
                onValueChange={setSelectedModelIdentifier}
                options={modelFilterOptions}
                placeholder={t('pages.account.sections.admin.merchantResources.models.modelFilter')}
                searchPlaceholder={t(
                  'pages.account.sections.admin.merchantResources.models.modelSearchPlaceholder',
                )}
                value={activeModelIdentifier}
              />
              <SearchableSelect
                className="w-full xl:w-48"
                disabled={mutatingId !== null}
                emptyText={t(
                  'pages.account.sections.admin.merchantResources.models.channelSearchEmpty',
                )}
                id={`admin-merchant-${merchantId}-channel-filter`}
                loading={loading}
                loadingText={t('pages.account.sections.admin.merchantResources.models.loading')}
                onValueChange={setSelectedChannelId}
                options={channelFilterOptions}
                placeholder={t(
                  'pages.account.sections.admin.merchantResources.models.channelFilter',
                )}
                searchPlaceholder={t(
                  'pages.account.sections.admin.merchantResources.models.channelSearchPlaceholder',
                )}
                value={activeChannelId}
              />
              <Select onValueChange={setSelectedBillingMode} value={selectedBillingMode}>
                <SelectTrigger
                  aria-label={t(
                    'pages.account.sections.admin.merchantResources.models.billingModeFilter',
                  )}
                  className="w-full xl:w-40"
                  disabled={mutatingId !== null}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('pages.account.sections.admin.merchantResources.models.allBillingModes')}
                  </SelectItem>
                  {(['token', 'request'] as const).map((billingMode) => (
                    <SelectItem key={billingMode} value={billingMode}>
                      {t(`pages.account.sections.merchant.models.billingModes.${billingMode}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedReviewStatus} value={selectedReviewStatus}>
                <SelectTrigger
                  aria-label={t(
                    'pages.account.sections.admin.merchantResources.models.reviewStatusFilter',
                  )}
                  className="w-full xl:w-40"
                  disabled={mutatingId !== null}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['all', 'approved', 'pending', 'rejected'] as const).map((reviewStatus) => (
                    <SelectItem key={reviewStatus} value={reviewStatus}>
                      {t(`pages.account.sections.merchant.models.reviewStatuses.${reviewStatus}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ),
          isRefreshing: loading,
          onQueryChange: setQuery,
          onRefresh: reload,
          placeholder: t('pages.account.sections.admin.merchantResources.models.search'),
          query,
        }}
      />
      <ResourceStatusDialog
        kind="model"
        loading={mutatingId !== null}
        name={statusTarget?.modelIdentifier ?? ''}
        offline={statusTarget?.status === 'offline'}
        onConfirm={(reason) => void confirmStatusChange(reason)}
        onOpenChange={(open) => {
          if (!open && mutatingId === null) setStatusTarget(null);
        }}
        open={statusTarget !== null}
      />
      <AdminMerchantModelDetailsDialog
        loadLatestOperation={loadLatestOperation}
        merchantId={merchantId}
        model={detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
      />
    </>
  );
}

function MerchantModelRoutingStatus({ model }: { model: MerchantModel }) {
  const { t } = useTranslation();
  const routable = isMerchantModelRoutable(model);
  return (
    <Badge
      className={
        routable
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-warning/25 bg-warning/10 text-warning'
      }
      variant="outline"
    >
      {t(
        `pages.account.sections.admin.merchantResources.models.routing.${
          routable ? 'available' : 'unavailable'
        }`,
      )}
    </Badge>
  );
}

type ModelLogStatusFilter = 'all' | MerchantRequestStatus;
const modelLogStatuses: ModelLogStatusFilter[] = [
  'all',
  'pending',
  'changesRequested',
  'approved',
  'completed',
  'cancelled',
];

function AdminMerchantModelLogs({
  loader,
  merchantId,
}: {
  loader: AdminMerchantResourceLoaders['modelLogs'];
  merchantId: number;
}) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [items, setItems] = useState<MerchantRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<ModelLogStatusFilter>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(DEFAULT_PAGE);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError(false);
    void loader(
      merchantId,
      {
        page,
        pageSize,
        query: debouncedQuery || undefined,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
        status: status === 'all' ? undefined : status,
      },
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          setPage(response.pagination.totalPages);
          return;
        }
        setItems(response.items);
        setPagination(response.pagination);
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
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, loader, merchantId, page, pageSize, refreshVersion, setGuest, status]);

  const columns: ManagementListColumn<MerchantRequest>[] = [
    {
      className: 'min-w-64 px-4',
      hideable: false,
      key: 'record',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.record'),
      mobile: false,
      render: (record) => (
        <div className="min-w-0">
          <strong className="block truncate text-sm">{record.subject}</strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{record.id}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.type'),
      render: (record) => t(`pages.account.sections.merchant.requests.types.${record.requestType}`),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.status'),
      render: (record) => <MerchantStatusBadge namespace="requests" status={record.status} />,
    },
    {
      className: 'min-w-40',
      key: 'operator',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.operator'),
      render: (record) => (
        <div className="grid gap-1">
          <Badge variant="secondary">
            {t(
              `pages.account.sections.admin.merchantResources.modelLogs.operatorSources.${record.operatorSource}`,
            )}
          </Badge>
          {record.operatorUserId ? (
            <span className="font-mono text-xs text-muted-foreground">
              {t('pages.account.sections.admin.merchantResources.modelLogs.operatorId', {
                id: record.operatorUserId,
              })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      className: 'min-w-64',
      key: 'description',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.description'),
      render: (record) => (
        <span className="block max-w-80 truncate text-xs text-muted-foreground">
          {record.operationReason || record.reviewNote || record.description || '—'}
        </span>
      ),
    },
    {
      className: 'min-w-44 font-mono text-xs text-muted-foreground',
      key: 'submittedAt',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.submittedAt'),
      render: (record) => formatMerchantDate(i18n.resolvedLanguage, record.submittedAt),
    },
    {
      className: 'min-w-44 font-mono text-xs text-muted-foreground',
      key: 'updatedAt',
      label: t('pages.account.sections.admin.merchantResources.modelLogs.columns.updatedAt'),
      render: (record) => formatMerchantDate(i18n.resolvedLanguage, record.updatedAt),
    },
  ];

  return (
    <ManagementList
      caption={t('pages.account.sections.admin.merchantResources.modelLogs.caption')}
      columns={columns}
      emptyDescription={t(
        'pages.account.sections.admin.merchantResources.modelLogs.emptyDescription',
      )}
      emptyIcon={ScrollText}
      emptyText={t('pages.account.sections.admin.merchantResources.modelLogs.empty')}
      items={items}
      mobileHeader={(record) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block truncate text-sm">{record.subject}</strong>
            <span className="mt-1 block font-mono text-xs text-muted-foreground">{record.id}</span>
          </div>
          <MerchantStatusBadge namespace="requests" status={record.status} />
        </div>
      )}
      pagination={{
        disabled: loading,
        metadata: pagination,
        onPageChange: setPage,
        onPageSizeChange: (value) => {
          setPageSize(value);
          setPage(DEFAULT_PAGE);
        },
      }}
      rowKey="id"
      selection={false}
      state={resourceListState(
        loading && items.length === 0,
        loadError,
        () => setRefreshVersion((version) => version + 1),
        t('pages.account.sections.admin.merchantResources.modelLogs.loading'),
        t('pages.account.sections.admin.merchantResources.loadError'),
        t('pages.account.sections.admin.merchantResources.retry'),
      )}
      toolbar={{
        filters: (
          <Select
            onValueChange={(value) => {
              setStatus(value as ModelLogStatusFilter);
              setPage(DEFAULT_PAGE);
            }}
            value={status}
          >
            <SelectTrigger
              aria-label={t(
                'pages.account.sections.admin.merchantResources.modelLogs.statusFilter',
              )}
              className="w-full md:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelLogStatuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.account.sections.merchant.requests.statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        isRefreshing: loading,
        onQueryChange: setQuery,
        onRefresh: () => setRefreshVersion((version) => version + 1),
        placeholder: t('pages.account.sections.admin.merchantResources.modelLogs.search'),
        query,
      }}
    />
  );
}

function useAdminMerchantCollection<T>(
  merchantId: number,
  loader: (merchantId: number, signal?: AbortSignal) => Promise<T[]>,
) {
  const { setGuest } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError(false);
    void loader(merchantId, controller.signal)
      .then((response) => {
        if (active) setItems(response);
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
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loader, merchantId, refreshVersion, setGuest]);

  return {
    items,
    loadError,
    loading,
    query,
    reload: () => setRefreshVersion((version) => version + 1),
    setItems,
    setQuery,
  };
}

function ResourceStatusButton({
  disabled,
  kind,
  offline,
  onClick,
}: {
  disabled: boolean;
  kind: 'channel' | 'model';
  offline: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const Icon = offline ? PlayCircle : PauseCircle;
  return (
    <AdminListActionButton
      disabled={disabled}
      icon={Icon}
      label={t(
        `pages.account.sections.admin.merchantResources.actions.${kind}.${offline ? 'restore' : 'offline'}`,
      )}
      onClick={onClick}
    />
  );
}

function ResourceStatusDialog({
  kind,
  loading,
  name,
  offline,
  onConfirm,
  onOpenChange,
  open,
}: {
  kind: 'channel' | 'model';
  loading: boolean;
  name: string;
  offline: boolean;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const action = offline ? 'restore' : 'offline';
  const translationPath = `pages.account.sections.admin.merchantResources.confirm.${kind}.${action}`;
  const [reason, setReason] = useState('');
  const reasonRequired = action === 'offline';

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`${translationPath}.title`)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`${translationPath}.description`, { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {reasonRequired ? (
          <div className="grid gap-2">
            <Label htmlFor={`merchant-resource-${kind}-reason`}>
              {t('pages.account.sections.admin.merchantResources.confirm.reasonLabel')}
            </Label>
            <Textarea
              disabled={loading}
              id={`merchant-resource-${kind}-reason`}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t(
                'pages.account.sections.admin.merchantResources.confirm.reasonPlaceholder',
              )}
              required
              rows={3}
              value={reason}
            />
            <span className="text-right text-xs text-muted-foreground">{reason.length}/500</span>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t('pages.account.sections.admin.merchantResources.confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || (reasonRequired && reason.trim().length === 0)}
            onClick={(event) => {
              event.preventDefault();
              onConfirm(reason.trim());
            }}
            variant={offline ? 'default' : 'destructive'}
          >
            {t(`${translationPath}.confirm`)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function resourceListState(
  loading: boolean,
  loadError: boolean,
  reload: () => void,
  loadingLabel: string,
  errorLabel: string,
  retryLabel: string,
): ManagementListState {
  if (loading) return { label: loadingLabel, status: 'loading' };
  if (loadError) return { label: errorLabel, onRetry: reload, retryLabel, status: 'error' };
  return { status: 'ready' };
}

function merchantModelPrice(
  pricingView: MerchantModelPricingView,
  language: string | undefined,
  t: TFunction,
): string {
  if (pricingView.billingMode === 'request') {
    const price = pricingView.pricing?.base?.request;
    return typeof price === 'number'
      ? t('pages.account.sections.admin.merchantResources.models.requestPrice', {
          price: formatPrice(language, price, pricingView.priceCurrency),
        })
      : '—';
  }
  return t('pages.account.sections.admin.merchantResources.models.tokenPrice', {
    input: formatPrice(language, pricingView.inputPrice, pricingView.priceCurrency),
    output: formatPrice(language, pricingView.outputPrice, pricingView.priceCurrency),
  });
}

function merchantPendingPriceStatus(
  model: MerchantModel,
  language: string | undefined,
  t: TFunction,
): string {
  const effectiveAt = model.pendingPrice?.effectiveAt;
  const translationPath = 'pages.account.sections.admin.merchantResources.models.details';
  if (effectiveAt) {
    return t(`${translationPath}.pendingPriceEffective`, {
      date: formatMerchantDate(language, effectiveAt),
    });
  }
  return t(
    `${translationPath}.${model.reviewStatus === 'rejected' ? 'pendingPriceRejected' : 'pendingPriceReview'}`,
  );
}

function formatPrice(language: string | undefined, value: number, currency: string): string {
  if (currency === 'USDT') return `USDT ${value.toLocaleString(language)}`;
  return new Intl.NumberFormat(language, {
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}
