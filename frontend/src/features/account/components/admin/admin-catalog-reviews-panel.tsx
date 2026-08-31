import { Boxes, ClipboardCheck, Eye, PackageCheck, RadioTower } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ManagementList,
  type ManagementListColumn,
  type ManagementListState,
} from '@/components/common/management-list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  reviewAdminCatalogItem,
  testAdminCatalogChannelConnection,
  testAdminCatalogModel,
  type AdminCatalogReview,
  type AdminCatalogReviewConnectionTest,
  type AdminCatalogReviewDecision,
  type AdminCatalogReviewKind,
  type AdminCatalogReviewModelTest,
  type AdminCatalogReviewStatus,
} from '@/features/account/api/admin-catalog-reviews';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { AdminListActionButton } from '@/features/account/components/admin/admin-list-action-button';
import { ReviewCatalogDialog } from '@/features/account/components/admin/review-catalog-dialog';
import {
  formatMerchantDate,
  formatUsd,
} from '@/features/account/components/merchant/merchant-demo-data';
import { useAdminCatalogReviews } from '@/features/account/hooks/use-admin-catalog-reviews';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type ReviewStatusFilter = 'all' | AdminCatalogReviewStatus;

const reviewStatuses: ReviewStatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

export function AdminCatalogReviewsPanel() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="channel">
      <div className="max-w-full overflow-x-auto pb-0.5">
        <TabsList className="h-auto w-max max-w-full gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="channel"
          >
            <RadioTower aria-hidden="true" />
            {t('pages.account.sections.admin.catalogReviews.tabs.channels')}
          </TabsTrigger>
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="model"
          >
            <Boxes aria-hidden="true" />
            {t('pages.account.sections.admin.catalogReviews.tabs.models')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="channel">
        <CatalogReviewQueue kind="channel" />
      </TabsContent>
      <TabsContent value="model">
        <CatalogReviewQueue kind="model" />
      </TabsContent>
    </Tabs>
  );
}

function CatalogReviewQueue({ kind }: { kind: AdminCatalogReviewKind }) {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<ReviewStatusFilter>('all');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [mutatingReviewId, setMutatingReviewId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AdminCatalogReview | null>(null);
  const handlePageOutOfRange = useCallback((nextPage: number) => setPage(nextPage), []);
  const { isLoading, loadError, pagination, reload, reviews } = useAdminCatalogReviews(
    {
      kind,
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

  async function handleReview(
    review: AdminCatalogReview,
    decision: AdminCatalogReviewDecision,
    reviewNote: string,
  ) {
    setMutatingReviewId(review.id);
    try {
      await reviewAdminCatalogItem(review.id, {
        decision,
        expectedStatus: review.status,
        kind: review.kind,
        reviewNote,
      });
      toast.success(
        t(
          `pages.account.sections.admin.catalogReviews.feedback.${review.status === 'pending' ? decision : `changed.${decision}`}`,
          {
            name: review.name,
          },
        ),
      );
      setReviewTarget(null);
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      const key =
        error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_CATALOG_REVIEW
          ? 'invalid'
          : error instanceof ApiError && error.code === API_ERROR_CODE.CATALOG_REVIEW_NOT_FOUND
            ? 'notFound'
            : error instanceof ApiError && error.code === API_ERROR_CODE.CATALOG_REVIEW_CONFLICT
              ? 'conflict'
              : 'general';
      if (key === 'conflict' || key === 'notFound') reload();
      toast.error(t(`pages.account.sections.admin.catalogReviews.errors.${key}`));
    } finally {
      setMutatingReviewId(null);
    }
  }

  async function handleTestConnection(
    review: AdminCatalogReview,
  ): Promise<AdminCatalogReviewConnectionTest> {
    try {
      return await testAdminCatalogChannelConnection(review.id);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      throw error;
    }
  }

  async function handleTestModel(review: AdminCatalogReview): Promise<AdminCatalogReviewModelTest> {
    try {
      return await testAdminCatalogModel(review.id);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      throw error;
    }
  }

  const columns: ManagementListColumn<AdminCatalogReview>[] = [
    {
      className: 'min-w-44 px-4',
      hideable: false,
      key: 'subject',
      label: t('pages.account.sections.admin.catalogReviews.columns.subject'),
      mobile: false,
      render: (review) => <strong className="block text-sm">{review.name}</strong>,
    },
    {
      className: 'min-w-72',
      hideable: false,
      key: 'channelId',
      label: t('pages.account.sections.admin.catalogReviews.columns.channelId'),
      mobile: { className: 'col-span-2' },
      render: (review) => (
        <span className="font-mono text-xs text-muted-foreground">{review.channelId}</span>
      ),
    },
    {
      className: 'min-w-40',
      key: 'merchant',
      label: t('pages.account.sections.admin.catalogReviews.columns.merchant'),
      render: (review) => review.merchant,
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
      render: (review) => <ReviewDetail review={review} />,
    },
    {
      className: 'min-w-52',
      key: 'reviewNote',
      label: t('pages.account.sections.admin.catalogReviews.columns.reviewNote'),
      mobile: { className: 'col-span-2' },
      render: (review) =>
        review.reviewNote ? (
          <span
            className={
              review.status === 'rejected'
                ? 'block whitespace-normal text-xs leading-5 text-destructive'
                : 'block whitespace-normal text-xs leading-5 text-muted-foreground'
            }
          >
            {review.reviewNote}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.catalogReviews.columns.status'),
      render: (review) => <AdminStatusBadge namespace="catalogReviews" status={review.status} />,
    },
    {
      className: 'min-w-44',
      key: 'submittedAt',
      label: t('pages.account.sections.admin.catalogReviews.columns.createdAt'),
      render: (review) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, review.submittedAt)}
        </span>
      ),
    },
    {
      className: 'w-20 min-w-20 text-center',
      hideable: false,
      key: 'review',
      label: t('pages.account.sections.admin.catalogReviews.columns.review'),
      render: (review) => (
        <ReviewAction
          disabled={mutatingReviewId !== null}
          onReview={() => setReviewTarget(review)}
          pending={review.status === 'pending'}
        />
      ),
    },
  ];
  const listState: ManagementListState = loadError
    ? {
        label: t('pages.account.sections.admin.catalogReviews.loadError'),
        onRetry: reload,
        retryLabel: t('pages.account.sections.admin.catalogReviews.retry'),
        status: 'error',
      }
    : isLoading && reviews.length === 0
      ? {
          label: t('pages.account.sections.admin.catalogReviews.loading'),
          status: 'loading',
        }
      : { status: 'ready' };

  return (
    <>
      <ManagementList
        caption={t(`pages.account.sections.admin.catalogReviews.captions.${kind}`)}
        columns={columns}
        disabled={mutatingReviewId !== null}
        emptyIcon={PackageCheck}
        emptyText={t(`pages.account.sections.admin.catalogReviews.empty.${kind}`)}
        items={reviews}
        mobileHeader={(review) => (
          <div className="min-w-0">
            <strong className="block truncate text-sm">{review.name}</strong>
          </div>
        )}
        pagination={{
          disabled: isLoading || mutatingReviewId !== null,
          metadata: pagination,
          onPageChange: setPage,
          onPageSizeChange: (nextPageSize) => {
            setPage(DEFAULT_PAGE);
            setPageSize(nextPageSize);
          },
        }}
        rowKey="id"
        selection={{ disabled: mutatingReviewId !== null }}
        state={listState}
        toolbar={{
          filters: (
            <Select
              disabled={mutatingReviewId !== null}
              onValueChange={(value) => {
                setPage(DEFAULT_PAGE);
                setStatus(value as ReviewStatusFilter);
              }}
              value={status}
            >
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
          ),
          isRefreshing: isLoading,
          onQueryChange: (value) => {
            setPage(DEFAULT_PAGE);
            setQuery(value);
          },
          onRefresh: reload,
          placeholder: t(`pages.account.sections.admin.catalogReviews.search.${kind}`),
          query,
        }}
      />
      <ReviewCatalogDialog
        isSubmitting={mutatingReviewId !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        onSubmit={handleReview}
        onTestConnection={handleTestConnection}
        onTestModel={handleTestModel}
        review={reviewTarget}
      />
    </>
  );
}

function ReviewDetail({ review }: { review: AdminCatalogReview }) {
  const { i18n, t } = useTranslation();
  const detail =
    review.kind === 'model' && review.modelIdentifier && review.contextWindow
      ? t('pages.account.sections.admin.catalogReviews.details.model', {
          context: formatContextWindow(review.contextWindow),
          identifier: review.modelIdentifier,
        })
      : review.provider;

  return (
    <div>
      <span className="block text-xs">{detail}</span>
      {review.action !== 'priceChange' && review.outputPrice !== null ? (
        <span className="mt-1 block font-mono text-xs text-muted-foreground">
          {formatUsd(i18n.resolvedLanguage, review.outputPrice)}
        </span>
      ) : null}
      {review.action !== 'priceChange' || review.currentOutputPrice === null ? null : (
        <span className="mt-1 block font-mono text-xs text-muted-foreground">
          {t('pages.account.sections.admin.catalogReviews.details.currentPrice', {
            price: formatUsd(i18n.resolvedLanguage, review.currentOutputPrice),
          })}
        </span>
      )}
      {review.action !== 'priceChange' || review.proposedOutputPrice === null ? null : (
        <span className="mt-1 block font-mono text-xs text-warning">
          {t(
            review.priceEffectiveAt
              ? 'pages.account.sections.admin.catalogReviews.details.scheduledPrice'
              : 'pages.account.sections.admin.catalogReviews.details.proposedPrice',
            {
              date: review.priceEffectiveAt
                ? formatMerchantDate(i18n.resolvedLanguage, review.priceEffectiveAt)
                : '',
              price: formatUsd(i18n.resolvedLanguage, review.proposedOutputPrice),
            },
          )}
        </span>
      )}
    </div>
  );
}

function ReviewAction({
  disabled,
  onReview,
  pending,
}: {
  disabled: boolean;
  onReview: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const icon = pending ? ClipboardCheck : Eye;
  const label = t(
    `pages.account.sections.admin.catalogReviews.reviewActions.${pending ? 'review' : 'detail'}`,
  );

  return (
    <div className="flex justify-center">
      <AdminListActionButton disabled={disabled} icon={icon} label={label} onClick={onReview} />
    </div>
  );
}

function formatContextWindow(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(2))}K`;
  return String(value);
}
