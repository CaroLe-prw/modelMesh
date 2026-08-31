import {
  AlertCircle,
  LoaderCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RadioTower,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ManagementFilterToolbar } from '@/components/common/management-data-list';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createMerchantChannel,
  deleteMerchantChannel,
  listMerchantChannelProviders,
  listMerchantChannels,
  updateMerchantChannel,
  updateMerchantChannelStatus,
  type MerchantChannel,
  type MerchantChannelDraft,
  type MerchantChannelProvider,
  type MerchantChannelStatus,
} from '@/features/account/api/merchant-channels';
import { MerchantChannelDialog } from '@/features/account/components/merchant/merchant-channel-dialog';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';

type ChannelStatusFilter = 'all' | MerchantChannelStatus;
const channelStatusFilters: ChannelStatusFilter[] = [
  'all',
  'pending',
  'rejected',
  'offline',
  'active',
];
const channelOptionalColumnIds = [
  'status',
  'reviewReason',
  'models',
  'successRate',
  'latency',
  'updatedAt',
] as const;
type MerchantChannelOptionalColumnId = (typeof channelOptionalColumnIds)[number];

type ChannelEditorState =
  | { mode: 'create'; open: true }
  | { channelId: string; mode: 'edit'; open: true }
  | { mode: 'create'; open: false };

function merchantChannelErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case API_ERROR_CODE.INVALID_MERCHANT_CHANNEL:
      return 'pages.account.sections.merchant.channels.feedback.invalid';
    case API_ERROR_CODE.MERCHANT_CHANNEL_NAME_ALREADY_EXISTS:
      return 'pages.account.sections.merchant.channels.feedback.duplicate';
    case API_ERROR_CODE.MERCHANT_CHANNEL_NOT_FOUND:
      return 'pages.account.sections.merchant.channels.feedback.notFound';
    case API_ERROR_CODE.MERCHANT_CHANNEL_PENDING_REVIEW:
      return 'pages.account.sections.merchant.channels.feedback.pendingReview';
    case API_ERROR_CODE.MERCHANT_CHANNEL_REVIEW_FIELDS_LOCKED:
      return 'pages.account.sections.merchant.channels.feedback.reviewFieldsLocked';
    default:
      return fallback;
  }
}

export function MerchantChannelsPanel() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const [channels, setChannels] = useState<MerchantChannel[]>([]);
  const [editor, setEditor] = useState<ChannelEditorState>({ mode: 'create', open: false });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ChannelStatusFilter>('all');
  const [visibleColumns, setVisibleColumns] = useState<
    ReadonlySet<MerchantChannelOptionalColumnId>
  >(() => new Set(channelOptionalColumnIds));
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [providerRefreshVersion, setProviderRefreshVersion] = useState(0);
  const [providers, setProviders] = useState<MerchantChannelProvider[]>([]);
  const [providerStatus, setProviderStatus] = useState<'error' | 'loading' | 'ready'>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MerchantChannel | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);
    void listMerchantChannels(controller.signal)
      .then((items) => {
        if (active) setChannels(items);
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
    const controller = new AbortController();
    let active = true;

    setProviderStatus('loading');
    void listMerchantChannelProviders(controller.signal)
      .then((items) => {
        if (!active) return;
        setProviders(items);
        setProviderStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setProviderStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [providerRefreshVersion, setGuest]);

  const visibleChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return channels.filter((channel) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        String(channel.channelId).includes(normalizedQuery) ||
        channel.id.toLocaleLowerCase().includes(normalizedQuery) ||
        channel.name.toLocaleLowerCase().includes(normalizedQuery) ||
        channel.provider.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || channel.status === status);
    });
  }, [channels, query, status]);

  const editingChannel =
    editor.open && editor.mode === 'edit'
      ? (channels.find((channel) => channel.id === editor.channelId) ?? null)
      : null;

  function openCreateDialog() {
    setProviderRefreshVersion((version) => version + 1);
    setEditor({ mode: 'create', open: true });
  }

  function openManageDialog(channel: MerchantChannel) {
    setProviderRefreshVersion((version) => version + 1);
    setEditor({ channelId: channel.id, mode: 'edit', open: true });
  }

  function closeEditor() {
    setEditor({ mode: 'create', open: false });
  }

  function reload() {
    setRefreshVersion((version) => version + 1);
  }

  function handleColumnVisibilityChange(column: MerchantChannelOptionalColumnId, visible: boolean) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (visible) next.add(column);
      else next.delete(column);
      return next;
    });
  }

  async function handleSaveChannel(draft: MerchantChannelDraft): Promise<void> {
    const editingId = editor.open && editor.mode === 'edit' ? editor.channelId : null;
    const resubmitting = editingId
      ? channels.some((channel) => channel.id === editingId && channel.status === 'rejected')
      : false;
    setIsMutating(true);
    try {
      if (editingId) {
        const updated = await updateMerchantChannel(editingId, draft);
        setChannels((current) =>
          current.map((channel) => (channel.id === updated.id ? updated : channel)),
        );
        toast.success(
          t(
            resubmitting
              ? 'pages.account.sections.merchant.channels.feedback.resubmitted'
              : 'pages.account.sections.merchant.channels.feedback.updated',
          ),
        );
      } else {
        const created = await createMerchantChannel({
          apiKey: draft.apiKey ?? '',
          availableModels: draft.availableModels,
          baseUrl: draft.baseUrl,
          description: draft.description,
          name: draft.name,
          providerId: draft.providerId,
          supportedModels: draft.supportedModels,
        });
        setChannels((current) => [created, ...current]);
        toast.success(t('pages.account.sections.merchant.channels.feedback.created'));
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantChannelErrorKey(
            error,
            editingId
              ? 'pages.account.sections.merchant.channels.feedback.updateError'
              : 'pages.account.sections.merchant.channels.feedback.createError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteChannel(channel: MerchantChannel): Promise<void> {
    setIsMutating(true);
    try {
      await deleteMerchantChannel(channel.id);
      setChannels((current) => current.filter((item) => item.id !== channel.id));
      toast.success(t('pages.account.sections.merchant.channels.feedback.deleted'));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantChannelErrorKey(
            error,
            'pages.account.sections.merchant.channels.feedback.deleteError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleToggleStatus(channel: MerchantChannel): Promise<void> {
    const nextStatus = channel.status === 'offline' ? 'active' : 'offline';
    setIsMutating(true);
    try {
      const updated = await updateMerchantChannelStatus(channel.id, nextStatus);
      setChannels((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(
        t(
          nextStatus === 'active'
            ? 'pages.account.sections.merchant.channels.feedback.enabled'
            : 'pages.account.sections.merchant.channels.feedback.offline',
        ),
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantChannelErrorKey(
            error,
            nextStatus === 'active'
              ? 'pages.account.sections.merchant.channels.feedback.enableError'
              : 'pages.account.sections.merchant.channels.feedback.offlineError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;

    try {
      await handleDeleteChannel(deleteTarget);
      setDeleteTarget(null);
    } catch {
      // The localized API error is already shown and the confirmation remains open for retry.
    }
  }

  const hasChannels = channels.length > 0;
  const isInitialLoading = isLoading && !hasChannels;

  return (
    <div className="grid min-w-0 gap-3">
      <ManagementFilterToolbar
        columnOptions={channelOptionalColumnIds.map((column) => ({
          key: column,
          label: t(`pages.account.sections.merchant.channels.columns.${column}`),
        }))}
        disabled={isMutating}
        isRefreshing={isLoading}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onQueryChange={setQuery}
        onRefresh={reload}
        placeholder={t('pages.account.sections.merchant.channels.search')}
        primaryAction={
          <Button className="flex-1 md:flex-none" disabled={isMutating} onClick={openCreateDialog}>
            <Plus aria-hidden="true" />
            {t('pages.account.sections.merchant.channels.add')}
          </Button>
        }
        query={query}
        visibleColumnKeys={visibleColumns}
      >
        <Select
          disabled={isMutating}
          onValueChange={(value) => setStatus(value as ChannelStatusFilter)}
          value={status}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.merchant.channels.statusFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {channelStatusFilters.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.merchant.channels.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ManagementFilterToolbar>

      {loadError && hasChannels ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            {t('pages.account.sections.merchant.channels.feedback.loadError')}
          </AlertTitle>
          <AlertDescription>
            <Button onClick={reload} size="sm" type="button" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t('pages.account.sections.merchant.channels.feedback.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isInitialLoading ? (
        <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t('pages.account.sections.merchant.channels.feedback.loading')}
            </p>
          </div>
        </Card>
      ) : loadError && !hasChannels ? (
        <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
          <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
          <strong className="mt-4 text-sm">
            {t('pages.account.sections.merchant.channels.feedback.loadError')}
          </strong>
          <Button className="mt-4" onClick={reload} type="button" variant="outline">
            <RefreshCw aria-hidden="true" />
            {t('pages.account.sections.merchant.channels.feedback.retry')}
          </Button>
        </Card>
      ) : (
        <>
          {visibleChannels.length > 0 ? (
            <>
              <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
                <Table>
                  <TableCaption className="sr-only">
                    {t('pages.account.sections.merchant.channels.caption')}
                  </TableCaption>
                  <TableHeader className="bg-secondary/55">
                    <TableRow className="hover:bg-secondary/55">
                      <TableHead className="h-12 min-w-28 px-4">
                        {t('pages.account.sections.merchant.channels.columns.channelId')}
                      </TableHead>
                      <TableHead className="min-w-56">
                        {t('pages.account.sections.merchant.channels.columns.channel')}
                      </TableHead>
                      <TableHead className="min-w-36">
                        {t('pages.account.sections.merchant.channels.columns.provider')}
                      </TableHead>
                      {visibleColumns.has('status') && (
                        <TableHead>
                          {t('pages.account.sections.merchant.channels.columns.status')}
                        </TableHead>
                      )}
                      {visibleColumns.has('reviewReason') && (
                        <TableHead className="min-w-56">
                          {t('pages.account.sections.merchant.channels.columns.reviewReason')}
                        </TableHead>
                      )}
                      {visibleColumns.has('models') && (
                        <TableHead>
                          {t('pages.account.sections.merchant.channels.columns.models')}
                        </TableHead>
                      )}
                      {visibleColumns.has('successRate') && (
                        <TableHead>
                          {t('pages.account.sections.merchant.channels.columns.successRate')}
                        </TableHead>
                      )}
                      {visibleColumns.has('latency') && (
                        <TableHead>
                          {t('pages.account.sections.merchant.channels.columns.latency')}
                        </TableHead>
                      )}
                      {visibleColumns.has('updatedAt') && (
                        <TableHead className="min-w-44">
                          {t('pages.account.sections.merchant.channels.columns.updatedAt')}
                        </TableHead>
                      )}
                      <TableHead className="w-[168px] min-w-[168px]">
                        {t('pages.account.sections.merchant.channels.columns.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleChannels.map((channel) => (
                      <ChannelTableRow
                        channel={channel}
                        disabled={isMutating}
                        key={channel.id}
                        onDelete={setDeleteTarget}
                        onEdit={openManageDialog}
                        onToggleStatus={(item) => void handleToggleStatus(item)}
                        visibleColumns={visibleColumns}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <div className="grid gap-3 md:hidden">
                {visibleChannels.map((channel) => (
                  <ChannelMobileCard
                    channel={channel}
                    disabled={isMutating}
                    key={channel.id}
                    onDelete={setDeleteTarget}
                    onEdit={openManageDialog}
                    onToggleStatus={(item) => void handleToggleStatus(item)}
                    visibleColumns={visibleColumns}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
              <RadioTower aria-hidden="true" className="size-6 text-muted-foreground" />
              <strong className="mt-4 text-sm">
                {t('pages.account.sections.merchant.channels.empty')}
              </strong>
            </Card>
          )}
        </>
      )}
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.channels.notice')}
      </p>
      <MerchantChannelDialog
        channel={editingChannel}
        channels={channels}
        disabled={isMutating}
        mode={editor.open ? editor.mode : 'create'}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        onProviderRetry={() => setProviderRefreshVersion((version) => version + 1)}
        onSave={handleSaveChannel}
        open={editor.open}
        providerStatus={providerStatus}
        providers={providers}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !isMutating) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pages.account.sections.merchant.channels.dialog.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pages.account.sections.merchant.channels.dialog.delete.description', {
                name: deleteTarget?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t('pages.account.sections.merchant.channels.dialog.delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              variant="destructive"
            >
              {isMutating ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {t('pages.account.sections.merchant.channels.dialog.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChannelTableRow({
  channel,
  disabled,
  onDelete,
  onEdit,
  onToggleStatus,
  visibleColumns,
}: {
  channel: MerchantChannel;
  disabled: boolean;
  onDelete: (channel: MerchantChannel) => void;
  onEdit: (channel: MerchantChannel) => void;
  onToggleStatus: (channel: MerchantChannel) => void;
  visibleColumns: ReadonlySet<MerchantChannelOptionalColumnId>;
}) {
  const { i18n } = useTranslation();

  return (
    <TableRow className="h-16">
      <TableCell className="px-4 font-mono text-sm text-muted-foreground">
        {channel.channelId}
      </TableCell>
      <TableCell>
        <strong className="block text-sm">{channel.name}</strong>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{channel.provider}</TableCell>
      {visibleColumns.has('status') && (
        <TableCell>
          <MerchantStatusBadge namespace="channels" status={channel.status} />
        </TableCell>
      )}
      {visibleColumns.has('reviewReason') && (
        <TableCell className="max-w-72 whitespace-normal text-sm leading-5">
          <ChannelReviewReason channel={channel} />
        </TableCell>
      )}
      {visibleColumns.has('models') && (
        <TableCell className="font-mono">{channel.modelCount}</TableCell>
      )}
      {visibleColumns.has('successRate') && (
        <TableCell className="font-mono">{channel.successRate.toFixed(2)}%</TableCell>
      )}
      {visibleColumns.has('latency') && (
        <TableCell className="font-mono">
          {channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—'}
        </TableCell>
      )}
      {visibleColumns.has('updatedAt') && (
        <TableCell className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, channel.updatedAt)}
        </TableCell>
      )}
      <TableCell>
        <ChannelActions
          channel={channel}
          disabled={disabled}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      </TableCell>
    </TableRow>
  );
}

function ChannelMobileCard({
  channel,
  disabled,
  onDelete,
  onEdit,
  onToggleStatus,
  visibleColumns,
}: {
  channel: MerchantChannel;
  disabled: boolean;
  onDelete: (channel: MerchantChannel) => void;
  onEdit: (channel: MerchantChannel) => void;
  onToggleStatus: (channel: MerchantChannel) => void;
  visibleColumns: ReadonlySet<MerchantChannelOptionalColumnId>;
}) {
  const { i18n, t } = useTranslation();
  const hasVisibleMetrics =
    visibleColumns.has('models') ||
    visibleColumns.has('successRate') ||
    visibleColumns.has('latency');

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <dl className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            {t('pages.account.sections.merchant.channels.columns.channel')}
          </dt>
          <dd className="mt-1 truncate text-sm font-semibold">{channel.name}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            {t('pages.account.sections.merchant.channels.columns.provider')}
          </dt>
          <dd className="mt-1 truncate text-sm">{channel.provider}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-xs text-muted-foreground">
            {t('pages.account.sections.merchant.channels.columns.channelId')}
          </dt>
          <dd className="mt-1 font-mono text-xs">{channel.channelId}</dd>
        </div>
      </dl>
      {visibleColumns.has('status') && (
        <MerchantStatusBadge namespace="channels" status={channel.status} />
      )}
      {visibleColumns.has('reviewReason') && (
        <dl className="rounded-lg bg-secondary/45 p-3 text-xs">
          <dt className="text-muted-foreground">
            {t('pages.account.sections.merchant.channels.columns.reviewReason')}
          </dt>
          <dd className="mt-1 whitespace-normal leading-5">
            <ChannelReviewReason channel={channel} />
          </dd>
        </dl>
      )}
      {hasVisibleMetrics && (
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/45 p-3 text-xs">
          {visibleColumns.has('models') && (
            <Metric
              label={t('pages.account.sections.merchant.channels.columns.models')}
              value={String(channel.modelCount)}
            />
          )}
          {visibleColumns.has('successRate') && (
            <Metric
              label={t('pages.account.sections.merchant.channels.columns.successRate')}
              value={`${channel.successRate.toFixed(2)}%`}
            />
          )}
          {visibleColumns.has('latency') && (
            <Metric
              label={t('pages.account.sections.merchant.channels.columns.latency')}
              value={channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—'}
            />
          )}
        </dl>
      )}
      {visibleColumns.has('updatedAt') && (
        <dl className="rounded-lg bg-secondary/45 p-3 text-xs">
          <Metric
            label={t('pages.account.sections.merchant.channels.columns.updatedAt')}
            value={formatMerchantDate(i18n.resolvedLanguage, channel.updatedAt)}
          />
        </dl>
      )}
      <div className="flex justify-end border-t border-border pt-2">
        <ChannelActions
          channel={channel}
          disabled={disabled}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      </div>
    </Card>
  );
}

const channelActionClassName =
  'h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-muted-foreground hover:bg-primary/8 hover:text-primary';
const channelDestructiveActionClassName =
  'h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive';

function ChannelActions({
  channel,
  disabled,
  onDelete,
  onEdit,
  onToggleStatus,
}: {
  channel: MerchantChannel;
  disabled: boolean;
  onDelete: (channel: MerchantChannel) => void;
  onEdit: (channel: MerchantChannel) => void;
  onToggleStatus: (channel: MerchantChannel) => void;
}) {
  const { t } = useTranslation();
  const translationPath = 'pages.account.sections.merchant.channels.actions';
  const labelPath = 'pages.account.sections.merchant.channels.actionLabels';
  const isOffline = channel.status === 'offline';
  const statusAction = isOffline ? 'enable' : 'offline';

  return (
    <div className="flex items-center justify-end gap-0.5 md:justify-center">
      <Button
        aria-label={t(`${translationPath}.edit`, { name: channel.name })}
        className={channelActionClassName}
        disabled={disabled}
        onClick={() => onEdit(channel)}
        title={t(`${translationPath}.edit`, { name: channel.name })}
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden="true" />
        <span className="text-[11px] leading-none">{t(`${labelPath}.edit`)}</span>
      </Button>

      {channel.status === 'active' || channel.status === 'offline' ? (
        <Button
          aria-label={t(`${translationPath}.${statusAction}`, { name: channel.name })}
          className={channelActionClassName}
          disabled={disabled}
          onClick={() => onToggleStatus(channel)}
          title={t(`${translationPath}.${statusAction}`, { name: channel.name })}
          type="button"
          variant="ghost"
        >
          {isOffline ? <PlayCircle aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
          <span className="text-[11px] leading-none">{t(`${labelPath}.${statusAction}`)}</span>
        </Button>
      ) : null}

      <Button
        aria-label={t(`${translationPath}.delete`, { name: channel.name })}
        className={channelDestructiveActionClassName}
        disabled={disabled}
        onClick={() => onDelete(channel)}
        title={t(`${translationPath}.delete`, { name: channel.name })}
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" />
        <span className="text-[11px] leading-none">{t(`${labelPath}.delete`)}</span>
      </Button>
    </div>
  );
}

function ChannelReviewReason({ channel }: { channel: MerchantChannel }) {
  if (!channel.reviewNote) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={channel.status === 'rejected' ? 'text-destructive' : undefined}>
      {channel.reviewNote}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono font-semibold">{value}</dd>
    </div>
  );
}
