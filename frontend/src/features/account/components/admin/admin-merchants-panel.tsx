import {
  AlertCircle,
  Ban,
  CircleCheck,
  LoaderCircle,
  RefreshCw,
  Store,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataPagination } from '@/components/common/data-pagination';
import { useManagementDataColumns as useAdminDataColumns } from '@/components/common/use-management-data-columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
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
  batchDeleteAdminMerchants,
  batchUpdateAdminMerchantStatus,
  deleteAdminMerchant,
  reviewAdminMerchant,
  updateAdminMerchant,
  updateAdminMerchantStatus,
  type AdminMerchant,
  type AdminMerchantReviewDecision,
  type AdminMerchantStatus,
  type AdminMerchantUpdate,
} from '@/features/account/api/admin-merchants';
import { createAdminUser, type AdminUserCreate } from '@/features/account/api/admin-users';
import { AdminMerchantActions } from '@/features/account/components/admin/admin-merchant-actions';
import {
  AdminDataList,
  AdminFilterToolbar,
  type AdminBatchAction,
  type AdminDataColumn,
  type AdminMobileField,
} from '@/features/account/components/admin/admin-data-list';
import { formatMicrousd } from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import {
  AdminUserDialog,
  type AdminUserDialogSubmission,
  type AdminUserDialogTarget,
} from '@/features/account/components/admin/admin-user-dialog';
import { EditMerchantDialog } from '@/features/account/components/admin/edit-merchant-dialog';
import { MerchantDetailsDialog } from '@/features/account/components/admin/merchant-details-dialog';
import { ReviewMerchantDialog } from '@/features/account/components/admin/review-merchant-dialog';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { useAuth } from '@/features/auth/context/auth-context';
import { useAdminMerchants } from '@/features/account/hooks/use-admin-merchants';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type MerchantStatusFilter = 'all' | AdminMerchantStatus;
type MerchantDeleteTarget = {
  clearSelection?: () => void;
  kind: 'single' | 'batch';
  merchants: AdminMerchant[];
};

const merchantStatuses: MerchantStatusFilter[] = [
  'all',
  'active',
  'pending',
  'rejected',
  'suspended',
];

export function AdminMerchantsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<MerchantStatusFilter>('all');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editTarget, setEditTarget] = useState<AdminMerchant | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<AdminMerchant | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AdminMerchant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantDeleteTarget | null>(null);
  const [createTarget, setCreateTarget] = useState<AdminUserDialogTarget | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const handlePageOutOfRange = useCallback((nextPage: number) => setPage(nextPage), []);
  const { isLoading, loadError, merchants, pagination, reload } = useAdminMerchants(
    {
      page,
      pageSize,
      query: debouncedQuery || undefined,
      status: status === 'all' ? undefined : status,
    },
    handlePageOutOfRange,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function reportMutationError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      setGuest();
      return;
    }

    const key =
      error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_EMAIL
        ? 'invalidEmail'
        : error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_PASSWORD
          ? 'invalidPassword'
          : error instanceof ApiError && error.code === API_ERROR_CODE.EMAIL_ALREADY_EXISTS
            ? 'emailAlreadyExists'
            : error instanceof ApiError &&
                (error.code === API_ERROR_CODE.INVALID_MANAGED_USER ||
                  error.code === API_ERROR_CODE.INVALID_MANAGED_MERCHANT)
              ? 'invalid'
              : error instanceof ApiError &&
                  error.code === API_ERROR_CODE.MANAGED_MERCHANT_NOT_FOUND
                ? 'notFound'
                : error instanceof ApiError &&
                    error.code === API_ERROR_CODE.MERCHANT_REVIEW_CONFLICT
                  ? 'reviewConflict'
                  : 'general';
    toast.error(t(`pages.account.sections.admin.merchants.errors.${key}`));
  }

  async function handleEdit(merchant: AdminMerchant, update: AdminMerchantUpdate) {
    setIsMutating(true);
    try {
      await updateAdminMerchant(merchant.id, update);
      toast.success(t('pages.account.sections.admin.merchants.feedback.updated'));
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCreate(submission: AdminUserDialogSubmission) {
    if (submission.kind !== 'create') return;

    const create: AdminUserCreate = { ...submission.value, role: 'merchant' };
    setIsMutating(true);
    try {
      const saved = await createAdminUser(create);
      toast.success(
        t('pages.account.sections.admin.merchants.feedback.created', {
          merchant: saved.username || saved.email,
        }),
      );
      setPage(DEFAULT_PAGE);
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleReview(
    merchant: AdminMerchant,
    decision: AdminMerchantReviewDecision,
    reviewNote: string,
  ) {
    setIsMutating(true);
    try {
      await reviewAdminMerchant(merchant.id, { decision, reviewNote });
      toast.success(t(`pages.account.sections.admin.merchants.feedback.${decision}`));
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleToggleStatus(merchant: AdminMerchant) {
    if (merchant.status !== 'active' && merchant.status !== 'suspended') return;

    const nextStatus = merchant.status === 'active' ? 'disabled' : 'active';
    setIsMutating(true);
    try {
      await updateAdminMerchantStatus(merchant.id, { status: nextStatus });
      toast.success(
        t(
          `pages.account.sections.admin.merchants.feedback.${nextStatus === 'disabled' ? 'disabled' : 'enabled'}`,
        ),
      );
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
    } finally {
      setIsMutating(false);
    }
  }

  async function updateSelectedMerchantStatus(
    selectedMerchants: AdminMerchant[],
    nextStatus: 'active' | 'disabled',
    clearSelection: () => void,
  ) {
    const eligibleMerchants = selectedMerchants.filter((merchant) =>
      nextStatus === 'active' ? merchant.status === 'suspended' : merchant.status === 'active',
    );
    if (eligibleMerchants.length === 0) return;

    setIsMutating(true);
    try {
      const response = await batchUpdateAdminMerchantStatus(
        eligibleMerchants.map((merchant) => merchant.id),
        { status: nextStatus },
      );
      toast.success(
        t(
          `pages.account.sections.admin.merchants.feedback.batch.${nextStatus === 'disabled' ? 'disabled' : 'active'}`,
          { count: response.updatedCount },
        ),
      );
      clearSelection();
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setIsMutating(true);
    try {
      const deletedCount =
        target.kind === 'single'
          ? await deleteAdminMerchant(target.merchants[0]!.id).then(() => 1)
          : await batchDeleteAdminMerchants(target.merchants.map((merchant) => merchant.id)).then(
              (response) => response.deletedCount,
            );
      toast.success(
        target.kind === 'single'
          ? t('pages.account.sections.admin.merchants.feedback.deleted')
          : t('pages.account.sections.admin.merchants.feedback.batchDeleted', {
              count: deletedCount,
            }),
      );
      target.clearSelection?.();
      setDeleteTarget(null);
      reload();
    } catch (error: unknown) {
      reportMutationError(error);
    } finally {
      setIsMutating(false);
    }
  }

  function renderStatistic(value: number | null) {
    return (
      value ?? (
        <span
          aria-label={t('pages.account.sections.admin.merchants.statisticsUnavailable')}
          className="text-muted-foreground"
          title={t('pages.account.sections.admin.merchants.statisticsUnavailable')}
        >
          —
        </span>
      )
    );
  }

  const columns: AdminDataColumn<AdminMerchant>[] = [
    {
      className: 'w-48 min-w-48 max-w-48 px-4',
      key: 'merchantName',
      label: t('pages.account.sections.admin.merchants.columns.merchantName'),
      render: (merchant) => <strong className="block text-sm">{merchant.name}</strong>,
    },
    {
      className: 'min-w-64',
      key: 'merchantEmail',
      label: t('pages.account.sections.admin.merchants.columns.merchantEmail'),
      render: (merchant) => (
        <span className="block truncate text-xs text-muted-foreground" title={merchant.email}>
          {merchant.email}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.merchants.columns.status'),
      render: (merchant) => <AdminStatusBadge namespace="merchants" status={merchant.status} />,
    },
    {
      key: 'channels',
      label: t('pages.account.sections.admin.merchants.columns.channels'),
      render: (merchant) => renderStatistic(merchant.channelCount),
    },
    {
      key: 'models',
      label: t('pages.account.sections.admin.merchants.columns.models'),
      render: (merchant) => renderStatistic(merchant.modelCount),
    },
    {
      key: 'balance',
      label: t('pages.account.sections.admin.merchants.columns.balance'),
      render: (merchant) => (
        <span className="font-mono text-xs">
          {formatMicrousd(i18n.resolvedLanguage, merchant.balanceMicrousd)}
        </span>
      ),
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.merchants.columns.createdAt'),
      render: (merchant) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, merchant.createdAt)}
        </span>
      ),
    },
    {
      className: 'w-52 min-w-52 max-w-52',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.merchants.columns.actions'),
      render: (merchant) => (
        <AdminMerchantActions
          disabled={isLoading || isMutating}
          merchant={merchant}
          onDelete={(target) => setDeleteTarget({ kind: 'single', merchants: [target] })}
          onEdit={setEditTarget}
          onReview={setReviewTarget}
          onToggleStatus={(target) => void handleToggleStatus(target)}
          onViewDetails={setDetailsTarget}
        />
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminMerchant>[] = [
    {
      key: 'merchantEmail',
      label: t('pages.account.sections.admin.merchants.columns.merchantEmail'),
      render: (merchant) => merchant.email,
    },
    {
      key: 'channels',
      label: t('pages.account.sections.admin.merchants.columns.channels'),
      render: (merchant) =>
        merchant.channelCount ?? t('pages.account.sections.admin.merchants.statisticsUnavailable'),
    },
    {
      key: 'models',
      label: t('pages.account.sections.admin.merchants.columns.models'),
      render: (merchant) =>
        merchant.modelCount ?? t('pages.account.sections.admin.merchants.statisticsUnavailable'),
    },
    {
      key: 'balance',
      label: t('pages.account.sections.admin.merchants.columns.balance'),
      render: (merchant) => formatMicrousd(i18n.resolvedLanguage, merchant.balanceMicrousd),
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.merchants.columns.createdAt'),
      render: (merchant) => formatMerchantDate(i18n.resolvedLanguage, merchant.createdAt),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(columns);
  const merchantBatchActions: AdminBatchAction<AdminMerchant>[] = [
    {
      disabled: (selectedMerchants) =>
        !selectedMerchants.some((merchant) => merchant.status === 'suspended'),
      icon: CircleCheck,
      key: 'enable',
      label: t('pages.account.sections.admin.merchants.actions.batchEnable'),
      onClick: (selectedMerchants, clearSelection) =>
        void updateSelectedMerchantStatus(selectedMerchants, 'active', clearSelection),
    },
    {
      disabled: (selectedMerchants) =>
        !selectedMerchants.some((merchant) => merchant.status === 'active'),
      icon: Ban,
      key: 'disable',
      label: t('pages.account.sections.admin.merchants.actions.batchDisable'),
      onClick: (selectedMerchants, clearSelection) =>
        void updateSelectedMerchantStatus(selectedMerchants, 'disabled', clearSelection),
      variant: 'destructive',
    },
    {
      icon: Trash2,
      key: 'delete',
      label: t('pages.account.sections.admin.merchants.actions.batchDelete'),
      onClick: (selectedMerchants, clearSelection) => {
        setDeleteTarget({ clearSelection, kind: 'batch', merchants: selectedMerchants });
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        columnOptions={columnOptions}
        disabled={isMutating}
        isRefreshing={isLoading}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(DEFAULT_PAGE);
        }}
        onRefresh={reload}
        placeholder={t('pages.account.sections.admin.merchants.search')}
        primaryAction={
          <Button
            className="flex-1 md:flex-none"
            disabled={isMutating}
            onClick={() => setCreateTarget({ kind: 'createMerchant' })}
            type="button"
          >
            <Store aria-hidden="true" />
            {t('pages.account.sections.admin.merchants.actions.create')}
          </Button>
        }
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select
          onValueChange={(value) => {
            setStatus(value as MerchantStatusFilter);
            setPage(DEFAULT_PAGE);
          }}
          value={status}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.merchants.statusFilter')}
            className="w-full md:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {merchantStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.merchants.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>

      {isLoading && merchants.length === 0 ? (
        <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.merchants.loading')}
            </p>
          </div>
        </Card>
      ) : loadError ? (
        <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
          <div>
            <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.merchants.loadError')}
            </p>
            <Button className="mt-3" onClick={reload} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t('pages.account.sections.admin.merchants.retry')}
            </Button>
          </div>
        </Card>
      ) : (
        <AdminDataList
          batchActions={merchantBatchActions}
          caption={t('pages.account.sections.admin.merchants.caption')}
          columns={visibleColumns}
          emptyIcon={Store}
          emptyText={t('pages.account.sections.admin.merchants.empty')}
          footer={
            merchants.length > 0 ? (
              <DataPagination
                disabled={isLoading}
                metadata={pagination}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(DEFAULT_PAGE);
                }}
              />
            ) : undefined
          }
          getKey={(merchant) => String(merchant.id)}
          items={merchants}
          mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
          mobileHeader={(merchant) => (
            <div className="grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{merchant.name}</strong>
                </div>
                <AdminStatusBadge namespace="merchants" status={merchant.status} />
              </div>
              <AdminMerchantActions
                disabled={isLoading || isMutating}
                merchant={merchant}
                onDelete={(target) => setDeleteTarget({ kind: 'single', merchants: [target] })}
                onEdit={setEditTarget}
                onReview={setReviewTarget}
                onToggleStatus={(target) => void handleToggleStatus(target)}
                onViewDetails={setDetailsTarget}
              />
            </div>
          )}
          notice={null}
          selectionDisabled={isLoading || isMutating}
          tableClassName="table-fixed"
        />
      )}

      <EditMerchantDialog
        merchant={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleEdit}
        open={editTarget !== null}
      />
      <MerchantDetailsDialog
        merchant={detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        open={detailsTarget !== null}
      />
      <AdminUserDialog
        onOpenChange={(open) => {
          if (!open) setCreateTarget(null);
        }}
        onSubmit={handleCreate}
        open={createTarget !== null}
        target={createTarget}
      />
      <ReviewMerchantDialog
        merchant={reviewTarget}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        onSubmit={handleReview}
        open={reviewTarget !== null}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !isMutating) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {t(
                `pages.account.sections.admin.merchants.deleteDialog.${deleteTarget?.kind === 'batch' ? 'batchTitle' : 'title'}`,
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'batch'
                ? t('pages.account.sections.admin.merchants.deleteDialog.batchDescription', {
                    count: deleteTarget.merchants.length,
                  })
                : t('pages.account.sections.admin.merchants.deleteDialog.description', {
                    merchant: deleteTarget?.merchants[0]?.name ?? '',
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t('pages.account.sections.admin.merchants.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              variant="destructive"
            >
              {isMutating && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {t(
                `pages.account.sections.admin.merchants.deleteDialog.${deleteTarget?.kind === 'batch' ? 'batchConfirm' : 'confirm'}`,
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
