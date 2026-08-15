import { useCallback, useEffect, useState } from 'react';
import {
  listAdminUsers,
  type AdminUser,
  type ListAdminUsersQuery,
} from '@/features/account/api/admin-users';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { emptyPagination, type PaginationMetadata } from '@/lib/pagination';

export function useAdminUsers(
  query: ListAdminUsersQuery,
  onPageOutOfRange: (page: number) => void,
) {
  const { setGuest } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const { page, pageSize, query: searchQuery, role, sortBy, sortOrder, status } = query;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);

    void listAdminUsers(
      { page, pageSize, query: searchQuery, role, sortBy, sortOrder, status },
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          onPageOutOfRange(response.pagination.totalPages);
          return;
        }

        setUsers(response.items);
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
  }, [
    onPageOutOfRange,
    page,
    pageSize,
    refreshVersion,
    role,
    searchQuery,
    setGuest,
    sortBy,
    sortOrder,
    status,
  ]);

  const reload = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return { isLoading, loadError, pagination, reload, users };
}
