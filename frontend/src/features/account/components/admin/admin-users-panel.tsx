import { Settings2, UserCog } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
  adminUsers,
  formatMicrousd,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from '@/features/account/components/admin/admin-demo-data';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';

type UserRoleFilter = 'all' | AdminUserRole;
type UserStatusFilter = 'all' | AdminUserStatus;

const roles: UserRoleFilter[] = ['all', 'personal', 'merchant', 'admin'];
const statuses: UserStatusFilter[] = ['all', 'active', 'disabled'];

export function AdminUsersPanel() {
  const { i18n, t } = useTranslation();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRoleFilter>('all');
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return adminUsers.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.email.toLocaleLowerCase().includes(normalizedQuery) ||
        user.id.toLocaleLowerCase().includes(normalizedQuery) ||
        user.lastLoginIp.includes(normalizedQuery);
      return (
        matchesQuery &&
        (role === 'all' || user.role === role) &&
        (status === 'all' || user.status === status)
      );
    });
  }, [query, role, status]);

  function showPreview() {
    toast.info(t('pages.account.sections.admin.previewAction'));
  }

  const userColumns: AdminDataColumn<AdminUser>[] = [
    {
      className: 'min-w-64 px-4',
      key: 'user',
      label: t('pages.account.sections.admin.users.columns.user'),
      render: (user) => (
        <div>
          <strong className="block text-sm">{user.email}</strong>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">{user.id}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('pages.account.sections.admin.users.columns.role'),
      render: (user) => (
        <Badge variant="secondary">
          {t(`pages.account.sections.admin.users.roles.${user.role}`)}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('pages.account.sections.admin.users.columns.status'),
      render: (user) => <AdminStatusBadge namespace="users" status={user.status} />,
    },
    {
      key: 'balance',
      label: t('pages.account.sections.admin.users.columns.balance'),
      render: (user) => (
        <span className="font-mono text-xs">
          {formatMicrousd(i18n.resolvedLanguage, user.balanceMicrousd)}
        </span>
      ),
    },
    {
      className: 'min-w-48',
      key: 'lastLogin',
      label: t('pages.account.sections.admin.users.columns.lastLogin'),
      render: (user) => (
        <div>
          <span className="block font-mono text-xs">
            {formatMerchantDate(i18n.resolvedLanguage, user.lastLoginAt)}
          </span>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">
            {user.lastLoginIp}
          </span>
        </div>
      ),
    },
    {
      className: 'min-w-44',
      key: 'createdAt',
      label: t('pages.account.sections.admin.users.columns.createdAt'),
      render: (user) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, user.createdAt)}
        </span>
      ),
    },
    {
      className: 'w-18 text-right',
      key: 'actions',
      label: t('pages.account.sections.admin.users.columns.actions'),
      render: (user) => (
        <Button
          aria-label={t('pages.account.sections.admin.users.manageLabel', { user: user.email })}
          onClick={showPreview}
          size="icon-sm"
          variant="ghost"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      ),
    },
  ];
  const userMobileFields: AdminMobileField<AdminUser>[] = [
    {
      key: 'balance',
      label: t('pages.account.sections.admin.users.columns.balance'),
      render: (user) => formatMicrousd(i18n.resolvedLanguage, user.balanceMicrousd),
    },
    {
      key: 'lastLogin',
      label: t('pages.account.sections.admin.users.columns.lastLogin'),
      render: (user) => formatMerchantDate(i18n.resolvedLanguage, user.lastLoginAt),
    },
    {
      key: 'lastLoginIp',
      label: t('pages.account.sections.admin.users.columns.lastLoginIp'),
      render: (user) => user.lastLoginIp,
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.users.columns.createdAt'),
      render: (user) => formatMerchantDate(i18n.resolvedLanguage, user.createdAt),
    },
    {
      key: 'actions',
      label: t('pages.account.sections.admin.users.columns.actions'),
      render: (user) => (
        <Button
          aria-label={t('pages.account.sections.admin.users.manageLabel', { user: user.email })}
          onClick={showPreview}
          size="icon-sm"
          variant="ghost"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      ),
    },
  ];
  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        onQueryChange={setQuery}
        placeholder={t('pages.account.sections.admin.users.search')}
        query={query}
      >
        <Select onValueChange={(value) => setRole(value as UserRoleFilter)} value={role}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.users.roleFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.users.roles.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => setStatus(value as UserStatusFilter)} value={status}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.users.statusFilter')}
            className="w-full md:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.users.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>
      <AdminDataList
        caption={t('pages.account.sections.admin.users.caption')}
        columns={userColumns}
        emptyIcon={UserCog}
        emptyText={t('pages.account.sections.admin.users.empty')}
        getKey={(user) => user.id}
        items={visibleUsers}
        mobileFields={userMobileFields}
        mobileHeader={(user) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{user.email}</strong>
              <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                {user.id}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant="secondary">
                {t(`pages.account.sections.admin.users.roles.${user.role}`)}
              </Badge>
              <AdminStatusBadge namespace="users" status={user.status} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
