import {
  AlertCircle,
  Building2,
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
import { Badge } from '@/components/ui/badge';
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
  AddBrandDialog,
  type NewBrandDraft,
} from '@/features/account/components/admin/add-brand-dialog';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';
import { EditBrandDialog } from '@/features/account/components/admin/edit-brand-dialog';
import type { BrandPreset } from '@/features/account/api/brand-presets';
import {
  createBrand as createBrandRequest,
  deleteBrand as deleteBrandRequest,
  listBrands,
  updateBrand as updateBrandRequest,
  updateBrandStatus,
  type BrandItem,
  type BrandStatus,
  type BrandUpdateDraft,
} from '@/features/account/api/brands';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { useBrandPresets } from '@/features/account/hooks/use-brand-presets';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';

type BrandStatusFilter = 'all' | BrandStatus;

const statusFilters: BrandStatusFilter[] = ['all', 'active', 'hidden'];
const emptyBrandPresets: BrandPreset[] = [];

function brandErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case API_ERROR_CODE.INVALID_BRAND:
      return 'pages.account.sections.admin.catalogManagement.brands.feedback.invalid';
    case API_ERROR_CODE.BRAND_ALREADY_EXISTS:
      return 'pages.account.sections.admin.catalogManagement.brands.feedback.duplicate';
    case API_ERROR_CODE.BRAND_PRESET_NOT_FOUND:
      return 'pages.account.sections.admin.catalogManagement.brands.feedback.presetNotFound';
    case API_ERROR_CODE.BRAND_NOT_FOUND:
      return 'pages.account.sections.admin.catalogManagement.brands.feedback.notFound';
    default:
      return fallback;
  }
}

export function AdminBrandsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const { retry: retryBrandPresets, state: brandPresetsState } = useBrandPresets();
  const [brandsState, setBrandsState] = useState<BrandItem[]>([]);
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [maxSortOrder, setMaxSortOrder] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<BrandStatusFilter>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const brandPresets =
    brandPresetsState.status === 'ready' ? brandPresetsState.presets : emptyBrandPresets;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);
    void listBrands(
      {
        query: debouncedQuery || undefined,
        status: status === 'all' ? undefined : status,
      },
      controller.signal,
    )
      .then((brands) => {
        if (!active) return;
        setBrandsState(brands);
        setExistingIds((current) => [...new Set([...current, ...brands.map((brand) => brand.id)])]);
        setMaxSortOrder((current) =>
          Math.max(current, ...brands.map((brand) => brand.sortOrder), 0),
        );
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
  }, [debouncedQuery, refreshVersion, setGuest, status]);

  function reload() {
    setRefreshVersion((version) => version + 1);
  }

  function manageBrand(brand: BrandItem) {
    setEditingBrand(brand);
    setEditDialogOpen(true);
  }

  async function createBrand(brand: NewBrandDraft): Promise<void> {
    setIsMutating(true);
    try {
      const created = await createBrandRequest(brand);
      setExistingIds((current) => [...new Set([...current, created.id])]);
      setMaxSortOrder((current) => Math.max(current, created.sortOrder));
      toast.success(
        t('pages.account.sections.admin.catalogManagement.brands.feedback.created', {
          name: created.name,
        }),
      );
      const filtersAreDefault = query.trim().length === 0 && status === 'all';
      setQuery('');
      setStatus('all');
      if (filtersAreDefault) reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          brandErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.brands.feedback.createError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function toggleBrand(brand: BrandItem) {
    const nextStatus: BrandStatus = brand.status === 'active' ? 'hidden' : 'active';
    setIsMutating(true);
    try {
      await updateBrandStatus(brand.id, nextStatus);
      toast.success(
        t(`pages.account.sections.admin.catalogManagement.brands.feedback.${nextStatus}`, {
          name: brand.name,
        }),
      );
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(
          brandErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.brands.feedback.statusUpdateError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function saveBrand(draft: BrandUpdateDraft): Promise<void> {
    if (!editingBrand) return;

    setIsMutating(true);
    try {
      const updated = await updateBrandRequest(editingBrand.id, draft);
      toast.success(
        t('pages.account.sections.admin.catalogManagement.brands.feedback.updated', {
          name: updated.name,
        }),
      );
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          brandErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.brands.feedback.updateError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteBrand(brand: BrandItem): Promise<void> {
    setIsMutating(true);
    try {
      await deleteBrandRequest(brand.id);
      setExistingIds((current) => current.filter((id) => id !== brand.id));
      toast.success(
        t('pages.account.sections.admin.catalogManagement.brands.feedback.deleted', {
          name: brand.name,
        }),
      );
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(
          brandErrorKey(
            error,
            'pages.account.sections.admin.catalogManagement.brands.feedback.deleteError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  const columns: AdminDataColumn<BrandItem>[] = [
    {
      className: 'min-w-56 px-4',
      key: 'brand',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.brand'),
      render: (brand) => (
        <div className="flex items-center gap-3">
          <BrandAvatar src={brand.avatarUrl} svg={brand.avatarSvg} />
          <div className="min-w-0">
            <strong className="block truncate text-sm">{brand.name}</strong>
            <span className="mt-1 block font-mono text-xs text-muted-foreground">{brand.id}</span>
          </div>
        </div>
      ),
      sticky: 'left',
    },
    {
      key: 'models',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.models'),
      render: (brand) => <span className="font-mono">{brand.modelCount}</span>,
    },
    {
      key: 'merchants',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.merchants'),
      render: (brand) => <span className="font-mono">{brand.merchantCount}</span>,
    },
    {
      key: 'sortOrder',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.sortOrder'),
      render: (brand) => <span className="font-mono">{brand.sortOrder}</span>,
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.status'),
      render: (brand) => <CatalogStatusBadge namespace="brands" status={brand.status} />,
    },
    {
      className: 'min-w-44',
      key: 'updatedAt',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.updatedAt'),
      render: (brand) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, brand.updatedAt)}
        </span>
      ),
    },
    {
      className: 'min-w-48',
      key: 'actions',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.actions'),
      render: (brand) => (
        <BrandActions
          brand={brand}
          disabled={isMutating}
          onDelete={deleteBrand}
          onManage={manageBrand}
          onToggle={toggleBrand}
        />
      ),
      sticky: 'right',
    },
  ];
  const mobileFields: AdminMobileField<BrandItem>[] = [
    {
      key: 'models',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.models'),
      render: (brand) => brand.modelCount,
    },
    {
      key: 'merchants',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.merchants'),
      render: (brand) => brand.merchantCount,
    },
    {
      key: 'sortOrder',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.sortOrder'),
      render: (brand) => brand.sortOrder,
    },
    {
      key: 'updatedAt',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.updatedAt'),
      render: (brand) => formatMerchantDate(i18n.resolvedLanguage, brand.updatedAt),
    },
    {
      className: 'col-span-2',
      key: 'actions',
      label: t('pages.account.sections.admin.catalogManagement.brands.columns.actions'),
      render: (brand) => (
        <BrandActions
          brand={brand}
          disabled={isMutating}
          onDelete={deleteBrand}
          onManage={manageBrand}
          onToggle={toggleBrand}
        />
      ),
    },
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        onQueryChange={setQuery}
        placeholder={t('pages.account.sections.admin.catalogManagement.brands.search')}
        query={query}
      >
        <Select onValueChange={(value) => setStatus(value as BrandStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.catalogManagement.brands.statusFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.catalogManagement.brands.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddBrandDialog
          existingIds={existingIds}
          onCreate={createBrand}
          onPresetRetry={retryBrandPresets}
          presets={brandPresets}
          presetStatus={brandPresetsState.status}
          suggestedSortOrder={maxSortOrder + 10}
        />
      </AdminFilterToolbar>
      {isLoading && brandsState.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-border bg-card text-center shadow-sm">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.catalogManagement.brands.loading')}
            </p>
          </div>
        </div>
      ) : loadError ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-border bg-card px-4 text-center shadow-sm">
          <div>
            <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.catalogManagement.brands.loadError')}
            </p>
            <Button className="mt-3" onClick={reload} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t('pages.account.sections.admin.catalogManagement.brands.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <AdminDataList
          caption={t('pages.account.sections.admin.catalogManagement.brands.caption')}
          columns={columns}
          emptyIcon={Building2}
          emptyText={t('pages.account.sections.admin.catalogManagement.brands.empty')}
          getKey={(brand) => brand.id}
          items={brandsState}
          mobileFields={mobileFields}
          mobileHeader={(brand) => (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BrandAvatar src={brand.avatarUrl} svg={brand.avatarSvg} />
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{brand.name}</strong>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    {brand.id}
                  </span>
                </div>
              </div>
              <CatalogStatusBadge namespace="brands" status={brand.status} />
            </div>
          )}
          notice={null}
        />
      )}
      <EditBrandDialog
        brand={editingBrand}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingBrand(null);
        }}
        onSave={saveBrand}
        open={editDialogOpen}
      />
    </div>
  );
}

function BrandActions({
  brand,
  disabled,
  onDelete,
  onManage,
  onToggle,
}: {
  brand: BrandItem;
  disabled: boolean;
  onDelete: (brand: BrandItem) => void;
  onManage: (brand: BrandItem) => void;
  onToggle: (brand: BrandItem) => void;
}) {
  const { t } = useTranslation();
  const isActive = brand.status === 'active';
  const manageLabel = t(
    'pages.account.sections.admin.catalogManagement.brands.actions.manageLabel',
  );
  const toggleAction = isActive ? 'hide' : 'show';
  const toggleLabel = t(
    `pages.account.sections.admin.catalogManagement.brands.actions.${toggleAction}Label`,
  );
  const deleteLabel = t(
    'pages.account.sections.admin.catalogManagement.brands.actions.deleteLabel',
  );

  return (
    <div className="flex flex-nowrap justify-start gap-0.5">
      <Button
        aria-label={t('pages.account.sections.admin.catalogManagement.brands.actions.manage', {
          name: brand.name,
        })}
        className="h-auto min-h-12 w-14 flex-col gap-1 px-1 py-1.5 text-[10px]"
        disabled={disabled}
        onClick={() => onManage(brand)}
        type="button"
        variant="ghost"
      >
        <Settings2 aria-hidden="true" />
        <span>{manageLabel}</span>
      </Button>
      <Button
        aria-label={t(
          `pages.account.sections.admin.catalogManagement.brands.actions.${isActive ? 'hide' : 'show'}`,
          { name: brand.name },
        )}
        className="h-auto min-h-12 w-14 flex-col gap-1 px-1 py-1.5 text-[10px]"
        disabled={disabled}
        onClick={() => onToggle(brand)}
        type="button"
        variant="ghost"
      >
        {isActive ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        <span>{toggleLabel}</span>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={t('pages.account.sections.admin.catalogManagement.brands.actions.delete', {
              name: brand.name,
            })}
            className="h-auto min-h-12 w-14 flex-col gap-1 px-1 py-1.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={disabled}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            <span>{deleteLabel}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pages.account.sections.admin.catalogManagement.brands.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pages.account.sections.admin.catalogManagement.brands.deleteDialog.description', {
                name: brand.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('pages.account.sections.admin.catalogManagement.brands.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => onDelete(brand)}
              variant="destructive"
            >
              {t('pages.account.sections.admin.catalogManagement.brands.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogStatusBadge({ namespace, status }: { namespace: 'brands'; status: BrandStatus }) {
  const { t } = useTranslation();
  const statusClass =
    status === 'active'
      ? 'border-success/25 bg-success/10 text-success'
      : 'border-border bg-secondary text-muted-foreground';

  return (
    <Badge className={statusClass} variant="outline">
      {t(`pages.account.sections.admin.catalogManagement.${namespace}.statuses.${status}`)}
    </Badge>
  );
}
