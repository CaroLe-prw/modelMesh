import { ClipboardList } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ManagementList,
  type ManagementListColumn,
  type ManagementListState,
} from '@/components/common/management-list';
import { TruncatedText } from '@/components/common/truncated-text';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listMerchantRequests,
  type MerchantRequest,
  type MerchantRequestSortField,
  type MerchantRequestSortOrder,
  type MerchantRequestStatus,
} from '@/features/account/api/merchant-requests';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
} from '@/lib/pagination';

type RequestStatusFilter = 'all' | MerchantRequestStatus;
const requestStatusFilters: RequestStatusFilter[] = [
  'all',
  'pending',
  'changesRequested',
  'cancelled',
  'approved',
  'completed',
];

function merchantRequestSubject(request: MerchantRequest, t: TFunction): string {
  if (request.origin === 'channelLifecycle') {
    const subjectKey =
      request.action === 'activate'
        ? 'channelActivated'
        : request.action === 'offline'
          ? 'channelOffline'
          : 'channelDeleted';
    return t(`pages.account.sections.merchant.requests.subjects.${subjectKey}`, {
      name: request.subject,
    });
  }
  if (request.origin === 'modelLifecycle') {
    const subjectKey =
      request.action === 'activate'
        ? 'modelActivated'
        : request.action === 'offline'
          ? 'modelOffline'
          : 'modelDeleted';
    return t(`pages.account.sections.merchant.requests.subjects.${subjectKey}`, {
      name: request.subject,
    });
  }
  if (request.origin === 'channelReview') {
    return t('pages.account.sections.merchant.requests.subjects.channelReview', {
      name: request.subject,
    });
  }
  if (request.origin === 'modelReview') {
    const subjectKey = request.action === 'priceChange' ? 'modelPricing' : 'modelReview';
    return t(`pages.account.sections.merchant.requests.subjects.${subjectKey}`, {
      name: request.subject,
    });
  }
  return request.subject;
}

export function MerchantRequestsPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest } = useAuth();
  const [requests, setRequests] = useState<MerchantRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<RequestStatusFilter>('all');
  const [sortBy, setSortBy] = useState<MerchantRequestSortField>('submittedAt');
  const [sortOrder, setSortOrder] = useState<MerchantRequestSortOrder>('desc');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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

    setIsLoading(true);
    setLoadError(false);
    void listMerchantRequests(
      {
        page,
        pageSize,
        query: debouncedQuery || undefined,
        sortBy,
        sortOrder,
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
        setRequests(response.items);
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
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, page, pageSize, refreshVersion, setGuest, sortBy, sortOrder, status]);

  function reload() {
    setRefreshVersion((version) => version + 1);
  }

  function changeSort(field: MerchantRequestSortField) {
    setPage(DEFAULT_PAGE);
    if (sortBy === field) {
      setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortBy(field);
    setSortOrder('desc');
  }

  const columns: ManagementListColumn<MerchantRequest>[] = [
    {
      headerClassName: 'min-w-64',
      hideable: false,
      key: 'request',
      label: t('pages.account.sections.merchant.requests.columns.request'),
      mobile: false,
      render: (request) => {
        const subject = merchantRequestSubject(request, t);
        return (
          <div className="min-w-0">
            <TruncatedText className="text-sm font-semibold" text={subject} />
          </div>
        );
      },
    },
    {
      key: 'type',
      label: t('pages.account.sections.merchant.requests.columns.type'),
      render: (request) =>
        t(`pages.account.sections.merchant.requests.types.${request.requestType}`),
    },
    {
      key: 'status',
      label: t('pages.account.sections.merchant.requests.columns.status'),
      mobile: false,
      render: (request) => <MerchantStatusBadge namespace="requests" status={request.status} />,
    },
    {
      className: 'min-w-36',
      key: 'operator',
      label: t('pages.account.sections.merchant.requests.columns.operator'),
      render: (request) => (
        <div className="grid gap-1">
          <Badge variant="secondary">
            {t(
              `pages.account.sections.merchant.requests.operatorSources.${request.operatorSource}`,
            )}
          </Badge>
          {request.operatorUserId ? (
            <span className="font-mono text-xs text-muted-foreground">
              {t('pages.account.sections.merchant.requests.operatorId', {
                id: request.operatorUserId,
              })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      className: 'min-w-56 text-xs text-muted-foreground',
      key: 'details',
      label: t('pages.account.sections.merchant.requests.columns.details'),
      render: (request) => (
        <TruncatedText
          text={request.operationReason || request.reviewNote || request.description || '—'}
        />
      ),
    },
    {
      className: 'font-mono text-xs text-muted-foreground',
      headerClassName: 'min-w-44',
      key: 'submittedAt',
      label: t('pages.account.sections.merchant.requests.columns.submittedAt'),
      render: (request) => formatMerchantDate(i18n.resolvedLanguage, request.submittedAt),
      sort: {
        active: sortBy === 'submittedAt',
        direction: sortOrder,
        label: t('pages.account.sections.merchant.requests.sortColumn', {
          column: t('pages.account.sections.merchant.requests.columns.submittedAt'),
        }),
        onChange: () => changeSort('submittedAt'),
      },
    },
    {
      className: 'font-mono text-xs text-muted-foreground',
      headerClassName: 'min-w-44',
      key: 'updatedAt',
      label: t('pages.account.sections.merchant.requests.columns.updatedAt'),
      render: (request) => formatMerchantDate(i18n.resolvedLanguage, request.updatedAt),
      sort: {
        active: sortBy === 'updatedAt',
        direction: sortOrder,
        label: t('pages.account.sections.merchant.requests.sortColumn', {
          column: t('pages.account.sections.merchant.requests.columns.updatedAt'),
        }),
        onChange: () => changeSort('updatedAt'),
      },
    },
  ];

  const listState: ManagementListState = isLoading
    ? {
        label: t('pages.account.sections.merchant.requests.feedback.loading'),
        status: 'loading',
      }
    : loadError
      ? {
          label: t('pages.account.sections.merchant.requests.feedback.loadError'),
          onRetry: reload,
          retryLabel: t('pages.account.sections.merchant.requests.feedback.retry'),
          status: 'error',
        }
      : { status: 'ready' };

  return (
    <div className="grid min-w-0 gap-3">
      <ManagementList
        caption={t('pages.account.sections.merchant.requests.caption')}
        columns={columns}
        emptyDescription={t('pages.account.sections.merchant.requests.emptyDescription')}
        emptyIcon={ClipboardList}
        emptyText={t('pages.account.sections.merchant.requests.empty')}
        items={requests}
        mobileHeader={(request) => (
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm leading-5">
                {merchantRequestSubject(request, t)}
              </strong>
            </div>
            <MerchantStatusBadge namespace="requests" status={request.status} />
          </div>
        )}
        rowKey="id"
        selection={false}
        state={listState}
        pagination={{
          disabled: isLoading,
          metadata: pagination,
          onPageChange: setPage,
          onPageSizeChange: (value) => {
            setPageSize(value);
            setPage(DEFAULT_PAGE);
          },
        }}
        toolbar={{
          filters: (
            <Select
              onValueChange={(value) => {
                setStatus(value as RequestStatusFilter);
                setPage(DEFAULT_PAGE);
              }}
              value={status}
            >
              <SelectTrigger
                aria-label={t('pages.account.sections.merchant.requests.statusFilter')}
                className="w-full md:w-44"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requestStatusFilters.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`pages.account.sections.merchant.requests.statuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
          isRefreshing: isLoading,
          onQueryChange: setQuery,
          onRefresh: reload,
          placeholder: t('pages.account.sections.merchant.requests.search'),
          query,
        }}
      />
    </div>
  );
}
