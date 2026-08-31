import {
  AlertCircle,
  Boxes,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  AdminDataList,
  AdminFilterToolbar,
  type AdminDataColumn,
  type AdminMobileField,
} from '@/features/account/components/admin/admin-data-list';
import {
  AddModelDialog,
  type NewModelDraft,
} from '@/features/account/components/admin/add-model-dialog';
import { EditModelDialog } from '@/features/account/components/admin/edit-model-dialog';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import type { BrandItem } from '@/features/account/api/brands';
import {
  listModelCatalogOptions,
  type ModelCatalogOption,
} from '@/features/account/api/model-catalog';
import {
  createModel as createModelRequest,
  createModelsBatch,
  deleteModel as deleteModelRequest,
  listModels,
  updateModelPricing,
  updateModelStatus,
  type ModelItem,
  type ModelPricingUpdateDraft,
  type ModelStatus,
} from '@/features/account/api/models';
import { useAuth } from '@/features/auth/context/auth-context';
import { formatUsd } from '@/features/models/data/marketplace';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
} from '@/lib/pagination';

type ModelStatusFilter = 'all' | ModelStatus;

const statusFilters: ModelStatusFilter[] = ['all', 'published', 'disabled'];

function modelErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case API_ERROR_CODE.INVALID_MODEL:
      return 'pages.account.sections.admin.catalogManagement.models.feedback.invalid';
    case API_ERROR_CODE.MODEL_ALREADY_EXISTS:
      return 'pages.account.sections.admin.catalogManagement.models.feedback.duplicate';
    case API_ERROR_CODE.BRAND_NOT_FOUND:
      return 'pages.account.sections.admin.catalogManagement.models.feedback.brandNotFound';
    case API_ERROR_CODE.MODEL_NOT_FOUND:
      return 'pages.account.sections.admin.catalogManagement.models.feedback.notFound';
    default:
      return fallback;
  }
}

export function AdminModelsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [brand, setBrand] = useState('all');
  const [brandOptions, setBrandOptions] = useState<BrandItem[]>([]);
  const [modelCatalogOptions, setModelCatalogOptions] = useState<
    Record<string, ModelCatalogOption[]>
  >({});
  const [brandStatus, setBrandStatus] = useState<'error' | 'loading' | 'ready'>('loading');
  const [brandRefreshVersion, setBrandRefreshVersion] = useState(0);
  const [modelsState, setModelsState] = useState<ModelItem[]>([]);
  const [modelRefreshVersion, setModelRefreshVersion] = useState(0);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsLoadError, setModelsLoadError] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [isMutating, setIsMutating] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<ModelStatusFilter>('all');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setBrandStatus('loading');
    void listModelCatalogOptions(controller.signal)
      .then((options) => {
        if (!active) return;
        setBrandOptions(options.brands);
        setModelCatalogOptions(options.modelsByBrand);
        setBrandStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setBrandStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [brandRefreshVersion, setGuest]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setModelsLoading(true);
    setModelsLoadError(false);
    void listModels(
      {
        brandId: brand === 'all' ? undefined : brand,
        page,
        pageSize,
        query: debouncedQuery || undefined,
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
        setModelsState(response.items);
        setPagination(response.pagination);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setModelsLoadError(true);
      })
      .finally(() => {
        if (active) setModelsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [brand, debouncedQuery, modelRefreshVersion, page, pageSize, setGuest, status]);

  function reloadModels() {
    setModelRefreshVersion((version) => version + 1);
  }

  function manageModel(model: ModelItem) {
    setEditingModel(model);
    setEditDialogOpen(true);
  }

  async function toggleModel(model: ModelItem) {
    const nextStatus: ModelStatus = model.status === 'published' ? 'disabled' : 'published';
    setIsMutating(true);
    try {
      await updateModelStatus(model.id, nextStatus);
      toast.success(
        t(`pages.account.sections.admin.catalogManagement.models.feedback.${nextStatus}`, {
          name: model.name,
        }),
      );
      reloadModels();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(
          modelErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.models.feedback.statusUpdateError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function createModels(models: NewModelDraft[]): Promise<void> {
    const firstModel = models[0];
    if (!firstModel) return;
    setIsMutating(true);
    try {
      const created =
        models.length === 1
          ? [await createModelRequest(firstModel)]
          : await createModelsBatch({
              brandId: firstModel.brandId,
              modelIds: models.map((model) => model.identifier),
              priceOverrides: firstModel.priceOverrides,
              status: firstModel.status,
            });
      setBrand('all');
      setQuery('');
      setDebouncedQuery('');
      setStatus('all');
      setPage(DEFAULT_PAGE);
      toast.success(
        created.length === 1
          ? t('pages.account.sections.admin.catalogManagement.models.feedback.created', {
              name: created[0]?.name,
            })
          : t('pages.account.sections.admin.catalogManagement.models.feedback.createdMany', {
              count: created.length,
            }),
      );
      reloadModels();
      setBrandRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          modelErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.models.feedback.createError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteModel(model: ModelItem): Promise<void> {
    setIsMutating(true);
    try {
      await deleteModelRequest(model.id);
      toast.success(
        t('pages.account.sections.admin.catalogManagement.models.feedback.deleted', {
          name: model.name,
        }),
      );
      if (modelsState.length === 1 && page > DEFAULT_PAGE) {
        setPage(page - 1);
      } else {
        reloadModels();
      }
      setBrandRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(
          modelErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.models.feedback.deleteError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function saveModelPricing(model: ModelItem, draft: ModelPricingUpdateDraft): Promise<void> {
    setIsMutating(true);
    try {
      const updated = await updateModelPricing(model.id, draft);
      toast.success(
        t('pages.account.sections.admin.catalogManagement.models.feedback.updated', {
          name: updated.name,
        }),
      );
      reloadModels();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          modelErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.models.feedback.updateError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  const columns: AdminDataColumn<ModelItem>[] = [
    {
      className: 'min-w-52 px-4',
      key: 'model',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.model'),
      render: (model) => (
        <div>
          <strong className="block font-mono text-sm">{model.name}</strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">
            {model.identifier}
          </span>
        </div>
      ),
    },
    {
      key: 'brand',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.brand'),
      render: (model) => (
        <span className="text-xs font-medium">{brandNameFor(model.brandId, brandOptions)}</span>
      ),
    },
    {
      key: 'context',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.context'),
      render: (model) => (
        <span className="font-mono text-xs">{formatContextWindow(model.contextWindow)}</span>
      ),
    },
    {
      key: 'inputPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.inputPrice'),
      render: (model) => <span className="font-mono text-xs">{formatUsd(model.inputPrice)}</span>,
    },
    {
      key: 'cacheReadPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.cacheReadPrice'),
      render: (model) => (
        <span className="font-mono text-xs">{formatUsd(model.cacheReadPrice)}</span>
      ),
    },
    {
      key: 'cacheWritePrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.cacheWritePrice'),
      render: (model) => (
        <span className="font-mono text-xs">{formatUsd(model.cacheWritePrice)}</span>
      ),
    },
    {
      key: 'outputPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.outputPrice'),
      render: (model) => <span className="font-mono text-xs">{formatUsd(model.outputPrice)}</span>,
    },
    {
      key: 'merchants',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.merchants'),
      render: (model) => <span className="font-mono">{model.merchantCount}</span>,
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.status'),
      render: (model) => <ModelStatusBadge status={model.status} />,
    },
    {
      className: 'min-w-44',
      key: 'updatedAt',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.updatedAt'),
      render: (model) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, model.updatedAt)}
        </span>
      ),
    },
    {
      className: 'min-w-56 px-3',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.actions'),
      render: (model) => (
        <ModelActions
          disabled={isMutating}
          model={model}
          onDelete={deleteModel}
          onManage={manageModel}
          onToggle={toggleModel}
        />
      ),
    },
  ];
  const mobileFields: AdminMobileField<ModelItem>[] = [
    {
      key: 'context',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.context'),
      render: (model) => formatContextWindow(model.contextWindow),
    },
    {
      key: 'inputPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.inputPrice'),
      render: (model) => formatUsd(model.inputPrice),
    },
    {
      key: 'cacheReadPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.cacheReadPrice'),
      render: (model) => formatUsd(model.cacheReadPrice),
    },
    {
      key: 'cacheWritePrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.cacheWritePrice'),
      render: (model) => formatUsd(model.cacheWritePrice),
    },
    {
      key: 'outputPrice',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.outputPrice'),
      render: (model) => formatUsd(model.outputPrice),
    },
    {
      key: 'merchants',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.merchants'),
      render: (model) => model.merchantCount,
    },
    {
      key: 'updatedAt',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.updatedAt'),
      render: (model) => formatMerchantDate(i18n.resolvedLanguage, model.updatedAt),
    },
    {
      className: 'col-span-2',
      key: 'actions',
      label: t('pages.account.sections.admin.catalogManagement.models.columns.actions'),
      render: (model) => (
        <ModelActions
          disabled={isMutating}
          model={model}
          onDelete={deleteModel}
          onManage={manageModel}
          onToggle={toggleModel}
        />
      ),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(columns);

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        columnOptions={columnOptions}
        disabled={isMutating}
        isRefreshing={modelsLoading}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(DEFAULT_PAGE);
        }}
        onRefresh={reloadModels}
        placeholder={t('pages.account.sections.admin.catalogManagement.models.search')}
        primaryAction={
          <AddModelDialog
            brands={brandOptions}
            brandStatus={brandStatus}
            existingModelKeys={modelsState.map((model) => `${model.brandId}/${model.identifier}`)}
            modelCatalogOptions={modelCatalogOptions}
            onBrandRetry={() => setBrandRefreshVersion((version) => version + 1)}
            onCreate={createModels}
          />
        }
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select
          onValueChange={(value) => {
            setBrand(value);
            setPage(DEFAULT_PAGE);
          }}
          value={brand}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.catalogManagement.models.brandFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('pages.account.sections.admin.catalogManagement.models.allBrands')}
            </SelectItem>
            {brandOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => {
            setStatus(value as ModelStatusFilter);
            setPage(DEFAULT_PAGE);
          }}
          value={status}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.catalogManagement.models.statusFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.catalogManagement.models.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      {modelsLoading && modelsState.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-border bg-card text-center shadow-sm">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.catalogManagement.models.loading')}
            </p>
          </div>
        </div>
      ) : modelsLoadError ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-border bg-card px-4 text-center shadow-sm">
          <div>
            <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.catalogManagement.models.loadError')}
            </p>
            <Button className="mt-3" onClick={reloadModels} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t('pages.account.sections.admin.catalogManagement.models.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AdminDataList
            caption={t('pages.account.sections.admin.catalogManagement.models.caption')}
            columns={visibleColumns}
            emptyIcon={Boxes}
            emptyText={t('pages.account.sections.admin.catalogManagement.models.empty')}
            footer={
              pagination.total > 0 ? (
                <DataPagination
                  disabled={modelsLoading || isMutating}
                  metadata={pagination}
                  onPageChange={setPage}
                  onPageSizeChange={(value) => {
                    setPageSize(value);
                    setPage(DEFAULT_PAGE);
                  }}
                />
              ) : undefined
            }
            getKey={(model) => String(model.id)}
            items={modelsState}
            mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
            mobileHeader={(model) => (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate font-mono text-sm">{model.name}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {brandNameFor(model.brandId, brandOptions)}
                  </span>
                </div>
                <ModelStatusBadge status={model.status} />
              </div>
            )}
            notice={null}
            selectionDisabled={isMutating}
          />
        </>
      )}
      <EditModelDialog
        model={editingModel}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingModel(null);
        }}
        onSave={saveModelPricing}
        open={editDialogOpen}
      />
    </div>
  );
}

function ModelActions({
  disabled,
  model,
  onDelete,
  onManage,
  onToggle,
}: {
  disabled: boolean;
  model: ModelItem;
  onDelete: (model: ModelItem) => void;
  onManage: (model: ModelItem) => void;
  onToggle: (model: ModelItem) => void;
}) {
  const { t } = useTranslation();
  const isPublished = model.status === 'published';
  const manageLabel = t(
    'pages.account.sections.admin.catalogManagement.models.actions.manageLabel',
  );
  const manageDescription = t(
    'pages.account.sections.admin.catalogManagement.models.actions.manageDescription',
    { name: model.name },
  );
  const toggleAction = isPublished ? 'unpublish' : 'publish';
  const toggleLabel = t(
    `pages.account.sections.admin.catalogManagement.models.actions.${toggleAction}Label`,
  );
  const toggleDescription = t(
    `pages.account.sections.admin.catalogManagement.models.actions.${toggleAction}Description`,
    { name: model.name },
  );
  const deleteLabel = t(
    'pages.account.sections.admin.catalogManagement.models.actions.deleteLabel',
  );
  const deleteDescription = t(
    'pages.account.sections.admin.catalogManagement.models.actions.deleteDescription',
    { name: model.name },
  );

  return (
    <div className="grid w-full grid-cols-3 items-stretch gap-1">
      <Button
        aria-label={manageDescription}
        className="h-auto min-h-12 min-w-0 w-full flex-col gap-1 px-1 py-1.5 text-[10px]"
        disabled={disabled}
        onClick={() => onManage(model)}
        title={manageDescription}
        type="button"
        variant="ghost"
      >
        <Settings2 aria-hidden="true" />
        <span className="whitespace-nowrap">{manageLabel}</span>
      </Button>
      <Button
        aria-label={toggleDescription}
        className="h-auto min-h-12 min-w-0 w-full flex-col gap-1 px-1 py-1.5 text-[10px]"
        disabled={disabled}
        onClick={() => onToggle(model)}
        title={toggleDescription}
        type="button"
        variant="ghost"
      >
        {isPublished ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        <span className="whitespace-nowrap">{toggleLabel}</span>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={deleteDescription}
            className="h-auto min-h-12 min-w-0 w-full flex-col gap-1 px-1 py-1.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={disabled}
            title={deleteDescription}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            <span className="whitespace-nowrap">{deleteLabel}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pages.account.sections.admin.catalogManagement.models.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pages.account.sections.admin.catalogManagement.models.deleteDialog.description', {
                name: model.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('pages.account.sections.admin.catalogManagement.models.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => onDelete(model)}
              variant="destructive"
            >
              {t('pages.account.sections.admin.catalogManagement.models.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModelStatusBadge({ status }: { status: ModelStatus }) {
  const { t } = useTranslation();
  const statusClass =
    status === 'published'
      ? 'border-success/25 bg-success/10 text-success'
      : 'border-border bg-secondary text-muted-foreground';

  return (
    <Badge className={statusClass} variant="outline">
      {t(`pages.account.sections.admin.catalogManagement.models.statuses.${status}`)}
    </Badge>
  );
}

function brandNameFor(brandId: string, brands: BrandItem[]): string {
  return brands.find((brand) => brand.id === brandId)?.name ?? brandId;
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000 && tokens % 1_000_000 === 0) return `${tokens / 1_000_000}M`;
  if (tokens >= 1_000 && tokens % 1_000 === 0) return `${tokens / 1_000}K`;
  return tokens.toLocaleString('en-US');
}
