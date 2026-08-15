import { AlertCircle, KeyRound, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataPagination } from '@/components/common/data-pagination';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listAdminUserApiKeys, type AdminUser } from '@/features/account/api/admin-users';
import { ApiKeyStatusBadge } from '@/features/account/components/api-keys/api-key-display';
import type { ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';
import { formatMerchantDate } from '@/features/account/components/merchant/merchant-demo-data';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
} from '@/lib/pagination';

export function AdminUserApiKeysDialog({
  onOpenChange,
  onUnauthenticated,
  open,
  user,
}: {
  onOpenChange: (open: boolean) => void;
  onUnauthenticated: () => void;
  open: boolean;
  user: AdminUser | null;
}) {
  const { i18n, t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [reloadToken, setReloadToken] = useState(0);
  const translationPath = 'pages.account.sections.admin.users.apiKeysDialog';

  useEffect(() => {
    if (!open || !user) return;

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(false);
    void listAdminUserApiKeys(user.id, { page, pageSize }, controller.signal)
      .then((response) => {
        setApiKeys(response.items);
        setPagination(response.pagination);
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
        setApiKeys([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [onUnauthenticated, open, page, pageSize, reloadToken, user]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setPage(DEFAULT_PAGE);
      setPageSize(DEFAULT_PAGE_SIZE);
      setApiKeys([]);
      setPagination(emptyPagination);
      setLoadError(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        closeLabel={t('common.close')}
      >
        <DialogHeader className="border-b border-border px-5 py-5 pr-12 text-left sm:px-7 sm:py-6 sm:pr-14">
          <DialogTitle>{t(`${translationPath}.title`)}</DialogTitle>
          <DialogDescription>{t(`${translationPath}.description`)}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          {user && (
            <div className="mx-5 mt-5 flex min-w-0 items-center gap-4 rounded-xl bg-secondary/65 p-4 sm:mx-7 sm:mt-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-sm font-semibold text-primary">
                {user.id}
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm">{user.email}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.username}
                </span>
              </div>
            </div>
          )}

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {isLoading && apiKeys.length === 0 ? (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <LoaderCircle
                    aria-hidden="true"
                    className="mx-auto size-5 animate-spin text-primary"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(`${translationPath}.loading`)}
                  </p>
                </div>
              </div>
            ) : loadError ? (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <AlertCircle aria-hidden="true" className="mx-auto size-5 text-destructive" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(`${translationPath}.loadError`)}
                  </p>
                  <Button
                    className="mt-3"
                    onClick={() => setReloadToken((value) => value + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw aria-hidden="true" />
                    {t(`${translationPath}.retry`)}
                  </Button>
                </div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border text-center">
                <div>
                  <KeyRound aria-hidden="true" className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">{t(`${translationPath}.empty`)}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {apiKeys.map((apiKey) => (
                  <ApiKeyCard apiKey={apiKey} language={i18n.resolvedLanguage} key={apiKey.id} />
                ))}
              </div>
            )}
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

function ApiKeyCard({ apiKey, language }: { apiKey: ApiKeyItem; language: string | undefined }) {
  const { t } = useTranslation();
  const translationPath = 'pages.account.sections.admin.users.apiKeysDialog';

  return (
    <article className="rounded-xl border border-border p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <strong className="min-w-0 truncate text-sm">{apiKey.name}</strong>
        <ApiKeyStatusBadge status={apiKey.status} />
      </div>
      <code className="mt-2 block truncate font-mono text-xs text-muted-foreground">
        {apiKey.maskedKey}
      </code>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {t(`${translationPath}.createdAt`)}：
          <time dateTime={apiKey.createdAt}>{formatMerchantDate(language, apiKey.createdAt)}</time>
        </span>
        {apiKey.lastUsedAt && (
          <span>
            {t(`${translationPath}.lastUsedAt`)}：
            <time dateTime={apiKey.lastUsedAt}>
              {formatMerchantDate(language, apiKey.lastUsedAt)}
            </time>
          </span>
        )}
      </div>
    </article>
  );
}
