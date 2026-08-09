import type { AccountRole } from '@/features/auth/api/auth';
import { apiClient } from '@/lib/api-client';

export type AccountRouteGroup = 'personal' | 'merchant' | 'admin';

export interface AccountRouteConfig {
  routeKey: string;
  path: string;
  labelKey: string;
  iconKey: string;
  group: AccountRouteGroup;
  sortOrder: number;
  enabled: boolean;
  roles: AccountRole[];
}

interface UpdateAccountRouteRolesRequest {
  roles: AccountRole[];
}

export function listVisibleAccountRoutes(): Promise<AccountRouteConfig[]> {
  return apiClient.get<AccountRouteConfig[]>('/account-routes');
}

export function listAllAccountRoutes(): Promise<AccountRouteConfig[]> {
  return apiClient.get<AccountRouteConfig[]>('/admin/account-routes');
}

export function updateAccountRouteRoles(
  routeKey: string,
  roles: AccountRole[],
): Promise<AccountRouteConfig> {
  return apiClient.put<AccountRouteConfig, UpdateAccountRouteRolesRequest>(
    `/admin/account-routes/${encodeURIComponent(routeKey)}/roles`,
    { roles },
  );
}
