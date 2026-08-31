import { useCallback, useEffect, useState } from 'react';
import {
  listAdminCatalogReviews,
  type AdminCatalogReview,
  type ListAdminCatalogReviewsQuery,
} from '@/features/account/api/admin-catalog-reviews';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { emptyPagination, type PaginationMetadata } from '@/lib/pagination';

export function useAdminCatalogReviews(
  query: ListAdminCatalogReviewsQuery,
  onPageOutOfRange: (page: number) => void,
) {
  const { setGuest } = useAuth();
  const [reviews, setReviews] = useState<AdminCatalogReview[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const { kind, page, pageSize, query: searchQuery, status } = query;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);
    void listAdminCatalogReviews(
      { kind, page, pageSize, query: searchQuery, status },
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          onPageOutOfRange(response.pagination.totalPages);
          return;
        }
        setReviews(response.items);
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
  }, [kind, onPageOutOfRange, page, pageSize, refreshVersion, searchQuery, setGuest, status]);

  const reload = useCallback(() => setRefreshVersion((version) => version + 1), []);

  return { isLoading, loadError, pagination, reload, reviews };
}
