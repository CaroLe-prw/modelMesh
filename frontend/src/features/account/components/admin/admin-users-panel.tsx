import {
  AlertCircle,
  Ban,
  CircleCheck,
  CircleDollarSign,
  Ellipsis,
  KeyRound,
  LoaderCircle,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  type LucideIcon,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataPagination } from '@/components/common/data-pagination';
import { useManagementDataColumns as useAdminDataColumns } from '@/components/common/use-management-data-columns';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  batchDeleteAdminUsers,
  createAdminUser,
  deleteAdminUser,
  depositAdminUser,
  refundAdminUser,
  updateAdminUser,
  type AdminUser,
  type AdminUserRole,
  type AdminUserSortBy,
  type AdminUserSortOrder,
  type AdminUserStatus,
  type AdminUserUpdate,
} from '@/features/account/api/admin-users';
import {
  AdminDataList,
  AdminFilterToolbar,
  type AdminBatchAction,
  type AdminDataColumn,
  type AdminMobileField,
} from '@/features/account/components/admin/admin-data-list';
import { AdminStatusBadge } from '@/features/account/components/admin/admin-status-badge';
import { AdminUserApiKeysDialog } from '@/features/account/components/admin/admin-user-api-keys-dialog';
import { AdminUserBalanceHistoryDialog } from '@/features/account/components/admin/admin-user-balance-history-dialog';
import {
  AdminUserDialog,
  type AdminUserDialogSubmission,
  type AdminUserDialogTarget,
} from '@/features/account/components/admin/admin-user-dialog';
import {
  AdminUserBalanceAdjustmentDialog,
  type AdminUserBalanceAdjustmentKind,
} from '@/features/account/components/admin/admin-user-deposit-dialog';
import { formatMicrousd } from '@/features/account/components/admin/admin-demo-data';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { useAdminUsers } from '@/features/account/hooks/use-admin-users';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type UserRoleFilter = 'all' | AdminUserRole;
type UserStatusFilter = 'all' | AdminUserStatus;
type UserSortValue = `${AdminUserSortBy}:${AdminUserSortOrder}`;
type UserMoreAction = 'apiKeys' | 'deposit' | 'refund' | 'depositHistory';
type BalanceAdjustmentOrigin = 'history' | 'list';

interface UserDeleteTarget {
  clearSelection?: () => void;
  kind: 'single' | 'batch';
  users: AdminUser[];
}

const roles: UserRoleFilter[] = ['all', 'personal', 'merchant', 'admin'];
const statuses: UserStatusFilter[] = ['all', 'active', 'disabled'];
const sortOptions: UserSortValue[] = [
  'balanceMicrousd:desc',
  'balanceMicrousd:asc',
  'lastActiveAt:desc',
  'lastActiveAt:asc',
  'lastUsedAt:desc',
  'lastUsedAt:asc',
  'createdAt:desc',
  'createdAt:asc',
];

function adminUserErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case API_ERROR_CODE.INVALID_EMAIL:
      return 'pages.account.sections.admin.users.feedback.invalidEmail';
    case API_ERROR_CODE.INVALID_PASSWORD:
      return 'pages.account.sections.admin.users.feedback.invalidPassword';
    case API_ERROR_CODE.EMAIL_ALREADY_EXISTS:
      return 'pages.account.sections.admin.users.feedback.emailAlreadyExists';
    case API_ERROR_CODE.INVALID_MANAGED_USER:
      return 'pages.account.sections.admin.users.feedback.invalid';
    case API_ERROR_CODE.MANAGED_USER_NOT_FOUND:
      return 'pages.account.sections.admin.users.feedback.notFound';
    case API_ERROR_CODE.MANAGED_USER_DELETE_CONFLICT:
      return 'pages.account.sections.admin.users.feedback.deleteConflict';
    default:
      return fallback;
  }
}

export function AdminUsersPanel() {
  const { i18n, t } = useTranslation();
  const { setGuest, state: authState } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [role, setRole] = useState<UserRoleFilter>('all');
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const [sortBy, setSortBy] = useState<AdminUserSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<AdminUserSortOrder>('desc');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dialogTarget, setDialogTarget] = useState<AdminUserDialogTarget | null>(null);
  const [apiKeyUser, setApiKeyUser] = useState<AdminUser | null>(null);
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false);
  const [balanceHistoryUser, setBalanceHistoryUser] = useState<AdminUser | null>(null);
  const [balanceHistoryDialogOpen, setBalanceHistoryDialogOpen] = useState(false);
  const [balanceAdjustmentUser, setBalanceAdjustmentUser] = useState<AdminUser | null>(null);
  const [balanceAdjustmentKind, setBalanceAdjustmentKind] =
    useState<AdminUserBalanceAdjustmentKind>('deposit');
  const [balanceAdjustmentOrigin, setBalanceAdjustmentOrigin] =
    useState<BalanceAdjustmentOrigin>('list');
  const [balanceAdjustmentDialogOpen, setBalanceAdjustmentDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDeleteTarget | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const handlePageOutOfRange = useCallback((nextPage: number) => setPage(nextPage), []);
  const { isLoading, loadError, pagination, reload, users } = useAdminUsers(
    {
      page,
      pageSize,
      query: debouncedQuery || undefined,
      role: role === 'all' ? undefined : role,
      sortBy,
      sortOrder,
      status: status === 'all' ? undefined : status,
    },
    handlePageOutOfRange,
  );
  const currentUserId = authState.status === 'authenticated' ? authState.user.id : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function manageUser(user: AdminUser) {
    setDialogTarget({ currentUserId, kind: 'edit', user });
  }

  function changeSort(field: AdminUserSortBy) {
    if (field === sortBy) {
      setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(DEFAULT_PAGE);
  }

  function selectSort(value: string) {
    const [field, order] = value.split(':') as [AdminUserSortBy, AdminUserSortOrder];
    setSortBy(field);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  }

  async function submitUser(submission: AdminUserDialogSubmission) {
    setIsMutating(true);
    try {
      let saved: AdminUser;
      if (submission.kind === 'create') {
        saved = await createAdminUser(submission.value);
      } else {
        if (dialogTarget?.kind !== 'edit') return;
        saved = await updateAdminUser(dialogTarget.user.id, submission.value);
      }
      toast.success(
        t(
          `pages.account.sections.admin.users.feedback.${submission.kind === 'create' ? 'created' : 'updated'}`,
          {
            user: saved.email,
          },
        ),
      );
      if (submission.kind === 'edit' && balanceAdjustmentOrigin === 'history') {
        setBalanceHistoryUser(saved);
      }
      if (page === DEFAULT_PAGE) reload();
      else setPage(DEFAULT_PAGE);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        throw error;
      }
      toast.error(
        t(
          adminUserErrorKey(
            error,
            `pages.account.sections.admin.users.feedback.${submission.kind === 'create' ? 'createError' : 'updateError'}`,
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function toggleUserStatus(user: AdminUser) {
    if (user.id === currentUserId) return;

    const nextStatus: AdminUserStatus = user.status === 'active' ? 'disabled' : 'active';
    setIsMutating(true);
    try {
      const saved = await updateAdminUser(user.id, adminUserUpdate(user, nextStatus));
      toast.success(
        t(`pages.account.sections.admin.users.feedback.${nextStatus}`, { user: saved.email }),
      );
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(adminUserErrorKey(error, 'pages.account.sections.admin.users.feedback.updateError')),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function updateSelectedUserStatus(
    selectedUsers: AdminUser[],
    nextStatus: AdminUserStatus,
    clearSelection: () => void,
  ) {
    const manageableUsers = selectedUsers.filter(
      (user) => user.id !== currentUserId && user.role !== 'admin' && user.status !== nextStatus,
    );
    if (manageableUsers.length === 0) return;

    setIsMutating(true);
    try {
      await Promise.all(
        manageableUsers.map((user) => updateAdminUser(user.id, adminUserUpdate(user, nextStatus))),
      );
      toast.success(
        t(`pages.account.sections.admin.users.feedback.batch.${nextStatus}`, {
          count: manageableUsers.length,
        }),
      );
      clearSelection();
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(adminUserErrorKey(error, 'pages.account.sections.admin.users.feedback.updateError')),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function adjustUserBalance(amountMicrousd: number, notes: string) {
    if (!balanceAdjustmentUser) return;

    setIsMutating(true);
    try {
      const saved = await (balanceAdjustmentKind === 'deposit'
        ? depositAdminUser(balanceAdjustmentUser.id, { amountMicrousd, notes })
        : refundAdminUser(balanceAdjustmentUser.id, { amountMicrousd, notes }));
      toast.success(
        t(`pages.account.sections.admin.users.feedback.${balanceAdjustmentKind}Succeeded`, {
          amount: formatMicrousd(i18n.resolvedLanguage, amountMicrousd),
          user: saved.email,
        }),
      );
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        throw error;
      }
      toast.error(
        t(
          error instanceof ApiError && error.code === API_ERROR_CODE.INVALID_BALANCE_ADJUSTMENT
            ? `pages.account.sections.admin.users.feedback.${balanceAdjustmentKind}Invalid`
            : adminUserErrorKey(
                error,
                `pages.account.sections.admin.users.feedback.${balanceAdjustmentKind}Error`,
              ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmUserDeletion() {
    const target = deleteTarget;
    if (!target) return;

    setIsMutating(true);
    try {
      const deletedCount =
        target.kind === 'single'
          ? await deleteAdminUser(target.users[0]!.id).then(() => 1)
          : await batchDeleteAdminUsers(target.users.map((user) => user.id)).then(
              (response) => response.deletedCount,
            );
      toast.success(
        target.kind === 'single'
          ? t('pages.account.sections.admin.users.feedback.deleted', {
              user: target.users[0]!.email,
            })
          : t('pages.account.sections.admin.users.feedback.batchDeleted', {
              count: deletedCount,
            }),
      );
      target.clearSelection?.();
      setDeleteTarget(null);
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(adminUserErrorKey(error, 'pages.account.sections.admin.users.feedback.deleteError')),
      );
    } finally {
      setIsMutating(false);
    }
  }

  function openUserMoreAction(user: AdminUser, action: UserMoreAction) {
    if (action === 'apiKeys') {
      setApiKeyUser(user);
      setApiKeysDialogOpen(true);
      return;
    }
    if (action === 'deposit' || action === 'refund') {
      setBalanceAdjustmentUser(user);
      setBalanceAdjustmentKind(action);
      setBalanceAdjustmentOrigin('list');
      setBalanceAdjustmentDialogOpen(true);
      return;
    }
    setBalanceHistoryUser(user);
    setBalanceHistoryDialogOpen(true);
  }

  const userColumns: AdminDataColumn<AdminUser>[] = [
    {
      className: 'w-56 min-w-56 max-w-56 px-4',
      key: 'user',
      label: t('pages.account.sections.admin.users.columns.user'),
      render: (user) => (
        <div className="min-w-0">
          <strong className="block truncate text-sm">{adminUsername(user)}</strong>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
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
      sort: {
        active: sortBy === 'balanceMicrousd',
        direction: sortOrder,
        label: t('pages.account.sections.admin.users.sortColumn', {
          column: t('pages.account.sections.admin.users.columns.balance'),
        }),
        onChange: () => changeSort('balanceMicrousd'),
      },
    },
    {
      key: 'lastActiveAt',
      label: t('pages.account.sections.admin.users.columns.lastActiveAt'),
      render: (user) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatOptionalDate(i18n.resolvedLanguage, user.lastActiveAt)}
        </span>
      ),
      sort: {
        active: sortBy === 'lastActiveAt',
        direction: sortOrder,
        label: t('pages.account.sections.admin.users.sortColumn', {
          column: t('pages.account.sections.admin.users.columns.lastActiveAt'),
        }),
        onChange: () => changeSort('lastActiveAt'),
      },
    },
    {
      key: 'lastUsedAt',
      label: t('pages.account.sections.admin.users.columns.lastUsedAt'),
      render: (user) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatOptionalDate(i18n.resolvedLanguage, user.lastUsedAt)}
        </span>
      ),
      sort: {
        active: sortBy === 'lastUsedAt',
        direction: sortOrder,
        label: t('pages.account.sections.admin.users.sortColumn', {
          column: t('pages.account.sections.admin.users.columns.lastUsedAt'),
        }),
        onChange: () => changeSort('lastUsedAt'),
      },
    },
    {
      key: 'createdAt',
      label: t('pages.account.sections.admin.users.columns.createdAt'),
      render: (user) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, user.createdAt)}
        </span>
      ),
      sort: {
        active: sortBy === 'createdAt',
        direction: sortOrder,
        label: t('pages.account.sections.admin.users.sortColumn', {
          column: t('pages.account.sections.admin.users.columns.createdAt'),
        }),
        onChange: () => changeSort('createdAt'),
      },
    },
    {
      className: 'w-44 min-w-44 max-w-44',
      hideable: false,
      key: 'actions',
      label: t('pages.account.sections.admin.users.columns.actions'),
      render: (user) => (
        <UserActions
          deleteDisabled={user.id === currentUserId || user.role === 'admin'}
          hideStatusAction={user.role === 'admin'}
          disabled={isMutating}
          onDelete={() => setDeleteTarget({ kind: 'single', users: [user] })}
          onEdit={() => manageUser(user)}
          onMoreAction={(action) => openUserMoreAction(user, action)}
          onToggleStatus={() => void toggleUserStatus(user)}
          status={user.status}
        />
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
      key: 'lastActiveAt',
      label: t('pages.account.sections.admin.users.columns.lastActiveAt'),
      render: (user) => formatOptionalDate(i18n.resolvedLanguage, user.lastActiveAt),
    },
    {
      key: 'lastUsedAt',
      label: t('pages.account.sections.admin.users.columns.lastUsedAt'),
      render: (user) => formatOptionalDate(i18n.resolvedLanguage, user.lastUsedAt),
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
        <UserActions
          deleteDisabled={user.id === currentUserId || user.role === 'admin'}
          hideStatusAction={user.role === 'admin'}
          disabled={isMutating}
          onDelete={() => setDeleteTarget({ kind: 'single', users: [user] })}
          onEdit={() => manageUser(user)}
          onMoreAction={(action) => openUserMoreAction(user, action)}
          onToggleStatus={() => void toggleUserStatus(user)}
          status={user.status}
        />
      ),
    },
  ];
  const { columnOptions, isColumnVisible, setColumnVisibility, visibleColumnKeys, visibleColumns } =
    useAdminDataColumns(userColumns);
  const userBatchActions: AdminBatchAction<AdminUser>[] = [
    {
      disabled: (selectedUsers) =>
        !selectedUsers.some(
          (user) => user.id !== currentUserId && user.role !== 'admin' && user.status !== 'active',
        ),
      icon: CircleCheck,
      key: 'enable',
      label: t('pages.account.sections.admin.users.actions.batchEnable'),
      onClick: (selectedUsers, clearSelection) =>
        void updateSelectedUserStatus(selectedUsers, 'active', clearSelection),
    },
    {
      disabled: (selectedUsers) =>
        !selectedUsers.some(
          (user) =>
            user.id !== currentUserId && user.role !== 'admin' && user.status !== 'disabled',
        ),
      icon: Ban,
      key: 'disable',
      label: t('pages.account.sections.admin.users.actions.batchDisable'),
      onClick: (selectedUsers, clearSelection) =>
        void updateSelectedUserStatus(selectedUsers, 'disabled', clearSelection),
      variant: 'destructive',
    },
    {
      disabled: (selectedUsers) =>
        !selectedUsers.some((user) => user.id !== currentUserId && user.role !== 'admin'),
      icon: Trash2,
      key: 'delete',
      label: t('pages.account.sections.admin.users.actions.batchDelete'),
      onClick: (selectedUsers, clearSelection) => {
        const deletableUsers = selectedUsers.filter(
          (user) => user.id !== currentUserId && user.role !== 'admin',
        );
        if (deletableUsers.length > 0) {
          setDeleteTarget({ clearSelection, kind: 'batch', users: deletableUsers });
        }
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="grid min-w-0 gap-3">
      <AdminFilterToolbar
        columnOptions={columnOptions}
        disabled={isMutating}
        isRefreshing={isLoading}
        onColumnVisibilityChange={setColumnVisibility}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(DEFAULT_PAGE);
        }}
        onRefresh={reload}
        placeholder={t('pages.account.sections.admin.users.search')}
        primaryAction={
          <Button
            className="flex-1 md:flex-none"
            disabled={isMutating}
            onClick={() => setDialogTarget({ kind: 'create' })}
            type="button"
          >
            <UserPlus aria-hidden="true" />
            {t('pages.account.sections.admin.users.actions.create')}
          </Button>
        }
        query={query}
        visibleColumnKeys={visibleColumnKeys}
      >
        <Select
          onValueChange={(value) => {
            setRole(value as UserRoleFilter);
            setPage(DEFAULT_PAGE);
          }}
          value={role}
        >
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
        <Select
          onValueChange={(value) => {
            setStatus(value as UserStatusFilter);
            setPage(DEFAULT_PAGE);
          }}
          value={status}
        >
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
        <Select onValueChange={selectSort} value={`${sortBy}:${sortOrder}`}>
          <SelectTrigger
            aria-label={t('pages.account.sections.admin.users.sortFilter')}
            className="w-full md:hidden"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`pages.account.sections.admin.users.sortOptions.${value.replace(':', '.')}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterToolbar>

      {isLoading && users.length === 0 ? (
        <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.users.loading')}
            </p>
          </div>
        </Card>
      ) : loadError ? (
        <Card className="grid min-h-48 place-items-center gap-0 px-6 text-center shadow-sm">
          <div>
            <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pages.account.sections.admin.users.loadError')}
            </p>
            <Button className="mt-3" onClick={reload} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t('pages.account.sections.admin.users.retry')}
            </Button>
          </div>
        </Card>
      ) : (
        <AdminDataList
          batchActions={userBatchActions}
          caption={t('pages.account.sections.admin.users.caption')}
          columns={visibleColumns}
          emptyIcon={UserCog}
          emptyText={t('pages.account.sections.admin.users.empty')}
          footer={
            users.length > 0 ? (
              <DataPagination
                disabled={isLoading || isMutating}
                metadata={pagination}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(DEFAULT_PAGE);
                }}
              />
            ) : undefined
          }
          getKey={(user) => String(user.id)}
          items={users}
          mobileFields={userMobileFields.filter((field) => isColumnVisible(field.key))}
          mobileHeader={(user) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block truncate text-sm">{adminUsername(user)}</strong>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant="secondary">
                  {t(`pages.account.sections.admin.users.roles.${user.role}`)}
                </Badge>
                <AdminStatusBadge namespace="users" status={user.status} />
              </div>
            </div>
          )}
          notice={null}
          selectionDisabled={isMutating}
          tableClassName="table-fixed"
        />
      )}

      <AdminUserDialog
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null);
        }}
        onSubmit={submitUser}
        open={dialogTarget !== null}
        target={dialogTarget}
      />
      <AdminUserApiKeysDialog
        onOpenChange={(open) => {
          setApiKeysDialogOpen(open);
          if (!open) setApiKeyUser(null);
        }}
        onUnauthenticated={setGuest}
        open={apiKeysDialogOpen}
        user={apiKeyUser}
      />
      <AdminUserBalanceAdjustmentDialog
        kind={balanceAdjustmentKind}
        onAdjust={adjustUserBalance}
        onOpenChange={(open) => {
          setBalanceAdjustmentDialogOpen(open);
          if (!open) {
            setBalanceAdjustmentUser(null);
            setBalanceAdjustmentOrigin('list');
          }
        }}
        open={balanceAdjustmentDialogOpen}
        user={balanceAdjustmentUser}
      />
      <AdminUserBalanceHistoryDialog
        onAdjust={(user, kind) => {
          setBalanceAdjustmentUser(user);
          setBalanceAdjustmentKind(kind);
          setBalanceAdjustmentOrigin('history');
          setBalanceAdjustmentDialogOpen(true);
        }}
        onOpenChange={(open) => {
          setBalanceHistoryDialogOpen(open);
          if (!open) setBalanceHistoryUser(null);
        }}
        onUnauthenticated={setGuest}
        open={balanceHistoryDialogOpen}
        user={balanceHistoryUser}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {t(
                `pages.account.sections.admin.users.deleteDialog.${deleteTarget?.kind === 'batch' ? 'batchTitle' : 'title'}`,
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'batch'
                ? t('pages.account.sections.admin.users.deleteDialog.batchDescription', {
                    count: deleteTarget.users.length,
                  })
                : t('pages.account.sections.admin.users.deleteDialog.description', {
                    user: deleteTarget?.users[0]?.email ?? '',
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t('pages.account.sections.admin.users.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => void confirmUserDeletion()}
              variant="destructive"
            >
              {t(
                `pages.account.sections.admin.users.deleteDialog.${deleteTarget?.kind === 'batch' ? 'batchConfirm' : 'confirm'}`,
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatOptionalDate(language: string | undefined, value: string | null): string {
  return value ? formatMerchantDate(language, value) : '—';
}

function adminUsername(user: AdminUser): string {
  return user.username?.trim() || user.email.split('@', 1)[0] || user.email;
}

function adminUserUpdate(user: AdminUser, status: AdminUserStatus): AdminUserUpdate {
  return {
    concurrencyLimit: user.concurrencyLimit,
    email: user.email,
    notes: user.notes ?? '',
    role: user.role,
    rpmLimit: user.rpmLimit,
    status,
    username: adminUsername(user),
  };
}

function UserActions({
  deleteDisabled,
  hideStatusAction,
  disabled,
  onDelete,
  onEdit,
  onMoreAction,
  onToggleStatus,
  status,
}: {
  deleteDisabled: boolean;
  hideStatusAction: boolean;
  disabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onMoreAction: (action: UserMoreAction) => void;
  onToggleStatus: () => void;
  status: AdminUserStatus;
}) {
  const { t } = useTranslation();
  const nextStatus = status === 'active' ? 'disable' : 'enable';

  return (
    <div className="flex items-center gap-1 md:justify-center">
      <ActionButton
        disabled={disabled}
        icon={Pencil}
        label={t('pages.account.sections.admin.users.actions.edit')}
        onClick={onEdit}
      />
      {!hideStatusAction && (
        <ActionButton
          disabled={disabled}
          icon={status === 'active' ? Ban : CircleCheck}
          label={t(`pages.account.sections.admin.users.actions.${nextStatus}`)}
          onClick={onToggleStatus}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('pages.account.sections.admin.users.actions.more')}
            className="h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
            disabled={disabled}
            type="button"
            variant="ghost"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
            {t('pages.account.sections.admin.users.actions.more')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-2">
          <DropdownMenuItem className="gap-3 px-3 py-2" onSelect={() => onMoreAction('apiKeys')}>
            <KeyRound aria-hidden="true" className="text-muted-foreground" />
            {t('pages.account.sections.admin.users.actions.apiKeys')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="-mx-2 my-1" />
          <DropdownMenuItem className="gap-3 px-3 py-2" onSelect={() => onMoreAction('deposit')}>
            <Plus aria-hidden="true" className="text-success" />
            {t('pages.account.sections.admin.users.actions.deposit')}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-3 py-2" onSelect={() => onMoreAction('refund')}>
            <Minus aria-hidden="true" className="text-warning" />
            {t('pages.account.sections.admin.users.actions.refund')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="-mx-2 my-1" />
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            onSelect={() => onMoreAction('depositHistory')}
          >
            <CircleDollarSign aria-hidden="true" className="text-muted-foreground" />
            {t('pages.account.sections.admin.users.actions.depositHistory')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="-mx-2 my-1" />
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            disabled={deleteDisabled}
            onSelect={onDelete}
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
            {t('pages.account.sections.admin.users.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
