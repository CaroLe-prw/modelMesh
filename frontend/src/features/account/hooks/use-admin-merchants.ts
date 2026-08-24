import { useCallback, useEffect, useState } from 'react';
import {
  listAdminMerchants,
  type AdminMerchant,
  type ListAdminMerchantsQuery,
} from '@/features/account/api/admin-merchants';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { emptyPagination, type PaginationMetadata } from '@/lib/pagination';

export function useAdminMerchants(
  query: ListAdminMerchantsQuery,
  onPageOutOfRange: (page: number) => void,
) {
  const { setGuest } = useAuth();
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const { page, pageSize, query: searchQuery, status } = query;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);
    void listAdminMerchants({ page, pageSize, query: searchQuery, status }, controller.signal)
      .then((response) => {
        if (!active) return;
        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          onPageOutOfRange(response.pagination.totalPages);
          return;
        }
        setMerchants(response.items);
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
  }, [onPageOutOfRange, page, pageSize, refreshVersion, searchQuery, setGuest, status]);

  const reload = useCallback(() => setRefreshVersion((version) => version + 1), []);

  return { isLoading, loadError, merchants, pagination, reload };
}
