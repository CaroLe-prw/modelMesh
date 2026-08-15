import { Check, PackageCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useManagementDataColumns as useAdminDataColumns } from '@/components/common/use-management-data-columns';
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
  adminCatalogReviews,
  formatMicrousd,
  type AdminCatalogKind,
  type AdminCatalogReview,
  type AdminReviewStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type CatalogKindFilter = 'all' | AdminCatalogKind;
type ReviewStatusFilter = 'all' | AdminReviewStatus;

const catalogKinds: CatalogKindFilter[] = ['all', 'channel', 'model'];
const reviewStatuses: ReviewStatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

export function AdminCatalogReviewsPanel() {
  const { i18n, t } = useTranslation();
  const [kind, setKind] = useState<CatalogKindFilter>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReviewStatusFilter>('all');
  const visibleReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminCatalogReviews.filter((review) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        review.id.toLocaleLowerCase().includes(normalizedQuery) ||
        review.name.toLocaleLowerCase().includes(normalizedQuery) ||
        review.merchant.toLocaleLowerCase().includes(normalizedQuery) ||
        review.detail.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (kind === 'all' || review.kind === kind) &&
        (status === 'all' || review.status === status)
      );
    });
  }, [kind, query, status]);

  function showPreview() {
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  const columns: AdminDataColumn<AdminCatalogReview>[] = [
    {
      className: 'min-w-60 px-4',
      key: 'subject',
      label: t('pages.account.sections.admin.catalogReviews.columns.subject'),
      render: (review) => (
        <div>
          <strong className="block text-sm">{review.name}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">{review.merchant}</span>
        </div>
      ),
    },
    {
      key: 'kind',
      label: t('pages.account.sections.admin.catalogReviews.columns.kind'),
      render: (review) => (
        <Badge variant="secondary">
          {t(`pages.account.sections.admin.catalogReviews.kinds.${review.kind}`)}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: t('pages.account.sections.admin.catalogReviews.columns.action'),
      render: (review) => (
        <span className="text-xs font-medium">
          {t(`pages.account.sections.admin.catalogReviews.actions.${review.action}`)}
        </span>
      ),
    },
    {
      className: 'min-w-52',
      key: 'detail',
      label: t('pages.account.sections.admin.catalogReviews.columns.detail'),
      render: (review) => (
        <div>
          <span className="block text-xs">{review.detail}</span>
          {review.priceMicrousd === undefined ? null : (
            <span className="mt-1 block font-mono text-xs text-muted-foreground">
              {formatMicrousd(i18n.resolvedLanguage, review.priceMicrousd)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.catalogReviews.columns.status'),
      render: (review) => <AdminStatusBadge namespace="catalogReviews" status={review.status} />,
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.catalogReviews.columns.createdAt'),
      render: (review) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, review.createdAt)}
        </span>
      ),
    },
    {
      className: 'min-w-24 text-right',
      hideable: false,
      key: 'review',
      label: t('pages.account.sections.admin.catalogReviews.columns.review'),
      render: (review) => (
        <ReviewActions onAct={showPreview} pending={review.status === 'pending'} />
      ),
    },
  ];
  const mobileFields: AdminMobileField<AdminCatalogReview>[] = [
    {
      key: 'action',
      label: t('pages.account.sections.admin.catalogReviews.columns.action'),
      render: (review) => t(`pages.account.sections.admin.catalogReviews.actions.${review.action}`),
    },
    {
      key: 'detail',
      label: t('pages.account.sections.admin.catalogReviews.columns.detail'),
      render: (review) => review.detail,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.catalogReviews.columns.createdAt'),
      render: (review) => formatMerchantDate(i18n.resolvedLanguage, review.createdAt),
    },
    {
      key: 'review',
      label: t('pages.account.sections.admin.catalogReviews.columns.review'),
      render: (review) => (
        <ReviewActions onAct={showPreview} pending={review.status === 'pending'} />
      ),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(columns);

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        columnOptions={columnOptions}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={setQuery}
        onRefresh={() => undefined}
        placeholder={t('pages.account.sections.admin.catalogReviews.search')}
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select onValueChange={(value) => setKind(value as CatalogKindFilter)} value={kind}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.catalogReviews.kindFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {catalogKinds.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.catalogReviews.kinds.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => setStatus(value as ReviewStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.catalogReviews.statusFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reviewStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.catalogReviews.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.catalogReviews.caption')}
        columns={visibleColumns}
        emptyIcon={PackageCheck}
        emptyText={t('pages.account.sections.admin.catalogReviews.empty')}
        getKey={(review) => review.id}
        items={visibleReviews}
        mobileFields={mobileFields.filter((field) => isColumnVisible(field.key))}
        mobileHeader={(review) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{review.name}</strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {review.merchant}
              </span>
            </div>
            <AdminStatusBadge namespace="catalogReviews" status={review.status} />
          </div>
        )}
      />
    </div>
  );
}

function ReviewActions({ onAct, pending }: { onAct: () => void; pending: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-1">
      <Button
        aria-label={t('pages.account.sections.admin.catalogReviews.reviewActions.approve')}
        disabled={!pending}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <Check aria-hidden="true" className="text-success" />
      </Button>
      <Button
        aria-label={t('pages.account.sections.admin.catalogReviews.reviewActions.reject')}
        disabled={!pending}
        onClick={onAct}
        size="icon-sm"
        variant="ghost"
      >
        <X aria-hidden="true" className="text-destructive" />
      </Button>
    </div>
  );
}
