import { apiClient } from '@/lib/api-client';
import type { ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type AdminUserRole = 'admin' | 'merchant' | 'personal';
export type AdminUserStatus = 'active' | 'disabled';
export type AdminUserSortBy = 'balanceMicrousd' | 'createdAt' | 'lastActiveAt' | 'lastUsedAt';
export type AdminUserSortOrder = 'asc' | 'desc';

export interface AdminUser {
  balanceMicrousd: number;
  concurrencyLimit: number;
  createdAt: string;
  email: string;
  id: number;
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastUsedAt: string | null;
  notes: string;
  role: AdminUserRole;
  rpmLimit: number;
  status: AdminUserStatus;
  username: string;
}

export interface ListAdminUsersQuery extends PaginationQuery {
  query?: string;
  role?: AdminUserRole;
  sortBy?: AdminUserSortBy;
  sortOrder?: AdminUserSortOrder;
  status?: AdminUserStatus;
}

export interface AdminUserUpdate {
  concurrencyLimit: number;
  email: string;
  notes: string;
  password?: string;
  role: AdminUserRole;
  rpmLimit: number;
  status: AdminUserStatus;
  username: string;
}

export interface AdminUserCreate {
  balanceMicrousd: number;
  concurrencyLimit: number;
  email: string;
  password: string;
  role: AdminUserRole;
  rpmLimit: number;
  username?: string;
}

export interface AdminUserBalanceAdjustment {
  amountMicrousd: number;
  notes: string;
}

export type AdminUserBalanceAdjustmentType = 'deposit' | 'refund';

export interface AdminUserBalanceAdjustmentRecord {
  adjustmentType: AdminUserBalanceAdjustmentType;
  amountMicrousd: number;
  balanceAfterMicrousd: number;
  createdAt: string;
  id: number;
  notes: string;
  operatorUserId: number;
  userId: number;
}

export interface AdminUserBalanceAdjustmentHistory extends PaginatedResponse<AdminUserBalanceAdjustmentRecord> {
  totalDepositedMicrousd: number;
}

export interface BatchDeleteAdminUsersResponse {
  deletedCount: number;
}

export interface ListAdminUserBalanceAdjustmentsQuery extends PaginationQuery {
  adjustmentType?: AdminUserBalanceAdjustmentType;
}

export function listAdminUsers(
  query: ListAdminUsersQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AdminUser>> {
  return apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', {
    query: {
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      role: query.role,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
    },
    signal,
  });
}

export function updateAdminUser(id: number, update: AdminUserUpdate): Promise<AdminUser> {
  return apiClient.put<AdminUser, AdminUserUpdate>(`/admin/users/${id}`, update);
}

export function createAdminUser(create: AdminUserCreate): Promise<AdminUser> {
  return apiClient.post<AdminUser, AdminUserCreate>('/admin/users', create);
}

export function deleteAdminUser(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/users/${id}`);
}

export function batchDeleteAdminUsers(userIds: number[]): Promise<BatchDeleteAdminUsersResponse> {
  return apiClient.post<BatchDeleteAdminUsersResponse, { userIds: number[] }>(
    '/admin/users/batch-delete',
    { userIds },
  );
}

export function depositAdminUser(
  id: number,
  adjustment: AdminUserBalanceAdjustment,
): Promise<AdminUser> {
  return apiClient.post<AdminUser, AdminUserBalanceAdjustment>(
    `/admin/users/${id}/deposit`,
    adjustment,
  );
}

export function refundAdminUser(
  id: number,
  adjustment: AdminUserBalanceAdjustment,
): Promise<AdminUser> {
  return apiClient.post<AdminUser, AdminUserBalanceAdjustment>(
    `/admin/users/${id}/refund`,
    adjustment,
  );
}

export function listAdminUserBalanceAdjustments(
  id: number,
  query: ListAdminUserBalanceAdjustmentsQuery,
  signal?: AbortSignal,
): Promise<AdminUserBalanceAdjustmentHistory> {
  return apiClient.get<AdminUserBalanceAdjustmentHistory>(
    `/admin/users/${id}/balance-adjustments`,
    {
      query: {
        adjustmentType: query.adjustmentType,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    },
  );
}

export function listAdminUserApiKeys(
  id: number,
  query: PaginationQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ApiKeyItem>> {
  return apiClient.get<PaginatedResponse<ApiKeyItem>>(`/admin/users/${id}/api-keys`, {
    query: {
      page: query.page,
      pageSize: query.pageSize,
    },
    signal,
  });
}
