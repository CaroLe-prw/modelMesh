import {
  AlertCircle,
  CircleDollarSign,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  type LucideIcon,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataPagination } from '@/components/common/data-pagination';
import { UserAvatar } from '@/components/common/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listAdminUserBalanceAdjustments,
  type AdminUser,
  type AdminUserBalanceAdjustmentRecord,
  type AdminUserBalanceAdjustmentType,
} from '@/features/account/api/admin-users';
import { formatMicrousd } from '@/features/account/components/admin/admin-demo-data';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
} from '@/lib/pagination';
import { userDisplayName } from '@/lib/user-display';

type BalanceAdjustmentFilter = 'all' | AdminUserBalanceAdjustmentType;

const balanceAdjustmentFilters: BalanceAdjustmentFilter[] = ['all', 'deposit', 'refund'];

export function AdminUserBalanceHistoryDialog({
  onAdjust,
  onOpenChange,
  onUnauthenticated,
  open,
  user,
}: {
  onAdjust: (user: AdminUser, kind: AdminUserBalanceAdjustmentType) => void;
  onOpenChange: (open: boolean) => void;
  onUnauthenticated: () => void;
  open: boolean;
  user: AdminUser | null;
}) {
  const { i18n, t } = useTranslation();
  const [adjustmentFilter, setAdjustmentFilter] = useState<BalanceAdjustmentFilter>('all');
  const [history, setHistory] = useState<AdminUserBalanceAdjustmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [reloadToken, setReloadToken] = useState(0);
  const [totalDepositedMicrousd, setTotalDepositedMicrousd] = useState(0);
  const translationPath = 'pages.account.sections.admin.users.balanceHistoryDialog';

  useEffect(() => {
    if (!open || !user) return;

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(false);
    void listAdminUserBalanceAdjustments(
      user.id,
      {
        adjustmentType: adjustmentFilter === 'all' ? undefined : adjustmentFilter,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((response) => {
        setHistory(response.items);
        setPagination(response.pagination);
        setTotalDepositedMicrousd(response.totalDepositedMicrousd);
        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          setPage(response.pagination.totalPages);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          onUnauthenticated();
          return;
        }
        setHistory([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [adjustmentFilter, onUnauthenticated, open, page, pageSize, reloadToken, user]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setAdjustmentFilter('all');
      setHistory([]);
      setLoadError(false);
      setPage(DEFAULT_PAGE);
      setPageSize(DEFAULT_PAGE_SIZE);
      setPagination(emptyPagination);
      setTotalDepositedMicrousd(0);
    }
  }

  function openAdjustment(kind: AdminUserBalanceAdjustmentType) {
    if (!user) return;
    onAdjust(user, kind);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-5xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-7 sm:py-6 sm:pr-14">
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription className="sr-only">
            {t(`${translationPath}.description`)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {user && (
              <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-secondary/65 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <UserAvatar
                    className="size-12 shrink-0"
                    fallbackClassName="font-mono text-base"
                    name={userDisplayName(user.email)}
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <strong className="truncate text-base">{user.email}</strong>
                      <span className="truncate text-sm text-primary">{user.username}</span>
                    </div>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t(`${translationPath}.createdAt`, {
                        date: formatMerchantDate(i18n.resolvedLanguage, user.createdAt),
                      })}
                    </span>
                  </div>
                </div>
                <div className="grid shrink-0 gap-1 border-t border-border pt-4 text-left sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                  <span className="text-xs text-muted-foreground">
                    {t(`${translationPath}.currentBalance`)}
                  </span>
                  <strong className="font-mono text-xl">
                    {formatMicrousd(i18n.resolvedLanguage, user.balanceMicrousd)}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {t(`${translationPath}.totalDeposited`, {
                      amount: formatMicrousd(i18n.resolvedLanguage, totalDepositedMicrousd),
                    })}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                onValueChange={(value) => {
                  setAdjustmentFilter(value as BalanceAdjustmentFilter);
                  setPage(DEFAULT_PAGE);
                }}
                value={adjustmentFilter}
              >
                <SelectTrigger
                  aria-label={t(`${translationPath}.filterLabel`)}
                  className="h-10 w-full sm:w-52"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {balanceAdjustmentFilters.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`${translationPath}.filters.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button onClick={() => openAdjustment('deposit')} type="button" variant="outline">
                  <Plus aria-hidden="true" className="text-success" />
                  {t('pages.account.sections.admin.users.actions.deposit')}
                </Button>
                <Button onClick={() => openAdjustment('refund')} type="button" variant="outline">
                  <Minus aria-hidden="true" className="text-warning" />
                  {t('pages.account.sections.admin.users.actions.refund')}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {isLoading && history.length === 0 ? (
                <HistoryState
                  icon={LoaderCircle}
                  iconClassName="animate-spin text-primary"
                  message={t(`${translationPath}.loading`)}
                />
              ) : loadError ? (
                <HistoryState
                  action={
                    <Button
                      onClick={() => setReloadToken((value) => value + 1)}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw aria-hidden="true" />
                      {t(`${translationPath}.retry`)}
                    </Button>
                  }
                  icon={AlertCircle}
                  iconClassName="text-destructive"
                  message={t(`${translationPath}.loadError`)}
                />
              ) : history.length === 0 ? (
                <HistoryState icon={WalletCards} message={t(`${translationPath}.empty`)} />
              ) : (
                history.map((record) => <BalanceHistoryItem key={record.id} record={record} />)
              )}
            </div>
          </div>

          {pagination.total > 0 && (
            <DataPagination
              disabled={isLoading}
              metadata={pagination}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(DEFAULT_PAGE);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BalanceHistoryItem({ record }: { record: AdminUserBalanceAdjustmentRecord }) {
  const { i18n, t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.users.balanceHistoryDialog';
  const isDeposit = record.adjustmentType === 'deposit';

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border p-4 sm:items-center">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${
          isDeposit ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive'
        }`}
      >
        <CircleDollarSign aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm">
          {t(`${translationPath}.recordTitle.${record.adjustmentType}`)}
        </strong>
        <span className="mt-1 block font-mono text-xs text-muted-foreground">
          {formatMerchantDate(i18n.resolvedLanguage, record.createdAt)}
        </span>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <strong
          className={`block font-mono text-sm ${isDeposit ? 'text-success' : 'text-destructive'}`}
        >
          {isDeposit ? '+' : '−'}
          {formatMicrousd(i18n.resolvedLanguage, record.amountMicrousd)}
        </strong>
        <span className="mt-1 block max-w-44 truncate text-xs text-muted-foreground">
          {record.notes || t(`${translationPath}.adminAdjustment`)}
        </span>
        <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
          {t(`${translationPath}.balanceAfter`, {
            amount: formatMicrousd(i18n.resolvedLanguage, record.balanceAfterMicrousd),
          })}
        </span>
      </div>
    </div>
  );
}

function HistoryState({
  action,
  icon: Icon,
  iconClassName = 'text-muted-foreground',
  message,
}: {
  action?: ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  message: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-border px-5 text-center">
      <div>
        <Icon aria-hidden="true" className={`mx-auto size-5 ${iconClassName}`} />
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
