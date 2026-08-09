import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataPagination } from '@/components/common/data-pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  updateApiKey,
  updateApiKeyStatus,
  type CreatedApiKey,
} from '@/features/account/api/api-keys';
import { ApiKeyCreatedDialog } from '@/features/account/components/api-keys/api-key-created-dialog';
import { ApiKeyDialog } from '@/features/account/components/api-keys/api-key-dialog';
import { ApiKeyToolbar } from '@/features/account/components/api-keys/api-key-toolbar';
import { ApiKeysMobileList } from '@/features/account/components/api-keys/api-keys-mobile-list';
import {
  defaultApiKeyVisibleColumnIds,
  type ApiKeyDraft,
  type ApiKeyItem,
  type ApiKeyOptionalColumnId,
  type ApiKeyStatus,
} from '@/features/account/components/api-keys/api-key-types';
import { ApiKeysTable } from '@/features/account/components/api-keys/api-keys-table';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  emptyPagination,
  type PaginationMetadata,
} from '@/lib/pagination';

type ApiKeyStatusFilter = 'all' | ApiKeyStatus;

function apiKeyErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case API_ERROR_CODE.INVALID_API_KEY:
      return 'pages.account.sections.apiKeys.feedback.invalid';
    case API_ERROR_CODE.API_KEY_NAME_ALREADY_EXISTS:
      return 'pages.account.sections.apiKeys.feedback.nameExists';
    case API_ERROR_CODE.API_KEY_ALREADY_EXISTS:
      return 'pages.account.sections.apiKeys.feedback.keyExists';
    case API_ERROR_CODE.API_KEY_NOT_FOUND:
      return 'pages.account.sections.apiKeys.feedback.notFound';
    default:
      return fallback;
  }
}

export function ApiKeysPanel() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>(emptyPagination);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<ApiKeyStatusFilter>('all');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKeyItem | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<CreatedApiKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ApiKeyOptionalColumnId>>(
    () => new Set(defaultApiKeyVisibleColumnIds),
  );
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError(false);

    void listApiKeys(
      {
        page,
        pageSize,
        query: debouncedQuery || undefined,
        status: status === 'all' ? undefined : status,
      },
      controller.signal,
    )
      .then((response) => {
        if (!active) {
          return;
        }

        if (response.pagination.totalPages > 0 && page > response.pagination.totalPages) {
          setPage(response.pagination.totalPages);
          return;
        }

        setApiKeys(response.items);
        setPagination(response.pagination);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }

        setLoadError(true);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery, page, pageSize, refreshVersion, setGuest, status]);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  function reload() {
    setRefreshVersion((version) => version + 1);
  }

  function handleCreate() {
    setEditingApiKey(null);
    setDialogOpen(true);
  }

  function handleColumnVisibilityChange(column: ApiKeyOptionalColumnId, visible: boolean) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (visible) {
        next.add(column);
      } else {
        next.delete(column);
      }
      return next;
    });
  }

  function handleEdit(apiKey: ApiKeyItem) {
    setEditingApiKey(apiKey);
    setDialogOpen(true);
  }

  async function handleSave(draft: ApiKeyDraft) {
    setIsMutating(true);
    const isEditing = editingApiKey !== null;

    try {
      if (isEditing) {
        await updateApiKey(editingApiKey.id, draft);
        toast.success(t('pages.account.sections.apiKeys.feedback.updated'));
      } else {
        const created = await createApiKey(draft);
        setCreatedApiKey(created);
        toast.success(t('pages.account.sections.apiKeys.feedback.created'));
      }

      setDialogOpen(false);
      setEditingApiKey(null);
      if (!isEditing && page !== DEFAULT_PAGE) {
        setPage(DEFAULT_PAGE);
      } else {
        reload();
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(
          apiKeyErrorKey(
            error,
            isEditing
              ? 'pages.account.sections.apiKeys.feedback.updateError'
              : 'pages.account.sections.apiKeys.feedback.createError',
          ),
        ),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCopy(apiKey: ApiKeyItem) {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    try {
      await navigator.clipboard.writeText(apiKey.maskedKey);
      setCopiedKeyId(apiKey.id);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKeyId(null);
        copyTimerRef.current = null;
      }, 1_500);
    } catch {
      setCopiedKeyId(null);
    }
  }

  async function handleToggleStatus(apiKey: ApiKeyItem) {
    const nextStatus: ApiKeyStatus = apiKey.status === 'active' ? 'paused' : 'active';
    setIsMutating(true);

    try {
      await updateApiKeyStatus(apiKey.id, nextStatus);
      toast.success(t('pages.account.sections.apiKeys.feedback.statusUpdated'));
      reload();
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(
        t(apiKeyErrorKey(error, 'pages.account.sections.apiKeys.feedback.statusUpdateError')),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDelete(apiKey: ApiKeyItem) {
    setIsMutating(true);

    try {
      await deleteApiKey(apiKey.id);
      toast.success(t('pages.account.sections.apiKeys.feedback.deleted'));
      setCopiedKeyId((current) => (current === apiKey.id ? null : current));
      if (apiKeys.length === 1 && page > DEFAULT_PAGE) {
        setPage(page - 1);
      } else {
        reload();
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setGuest();
        return;
      }
      toast.error(t(apiKeyErrorKey(error, 'pages.account.sections.apiKeys.feedback.deleteError')));
    } finally {
      setIsMutating(false);
    }
  }

  const hasItems = apiKeys.length > 0;
  const isInitialLoading = isLoading && !hasItems;

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0 shadow-[0_18px_50px_color-mix(in_srgb,var(--color-text)_5%,transparent)]">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold tracking-[-0.02em]">
              {t('pages.account.sections.apiKeys.panelTitle')}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('pages.account.sections.apiKeys.panelDescription')}
            </p>
          </div>
          <span className="self-start rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
            {t('pages.account.sections.apiKeys.keyCount', {
              count: pagination.total,
            })}
          </span>
        </div>

        <ApiKeyToolbar
          disabled={isMutating}
          isRefreshing={isLoading}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onCreate={handleCreate}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(DEFAULT_PAGE);
          }}
          onRefresh={reload}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(DEFAULT_PAGE);
          }}
          query={query}
          status={status}
          visibleColumns={visibleColumns}
        />

        {loadError && hasItems && (
          <Alert className="m-4 w-auto" variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>{t('pages.account.sections.apiKeys.feedback.loadError')}</AlertTitle>
            <AlertDescription>
              <Button onClick={reload} size="sm" type="button" variant="outline">
                <RefreshCw aria-hidden="true" />
                {t('pages.account.sections.apiKeys.feedback.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isInitialLoading ? (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <LoaderCircle
                aria-hidden="true"
                className="mx-auto size-6 animate-spin text-primary"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                {t('pages.account.sections.apiKeys.feedback.loading')}
              </p>
            </div>
          </div>
        ) : loadError && !hasItems ? (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <AlertCircle aria-hidden="true" className="mx-auto size-6 text-destructive" />
              <strong className="mt-3 block text-sm">
                {t('pages.account.sections.apiKeys.feedback.loadError')}
              </strong>
              <Button className="mt-4" onClick={reload} size="sm" variant="outline">
                <RefreshCw aria-hidden="true" />
                {t('pages.account.sections.apiKeys.feedback.retry')}
              </Button>
            </div>
          </div>
        ) : !hasItems ? (
          <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
            <div>
              <strong className="text-sm">{t('pages.account.sections.apiKeys.emptyTitle')}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('pages.account.sections.apiKeys.emptyDescription')}
              </p>
            </div>
          </div>
        ) : (
          <>
            <ApiKeysMobileList
              apiKeys={apiKeys}
              copiedKeyId={copiedKeyId}
              disabled={isMutating}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              visibleColumns={visibleColumns}
            />
            <div className="hidden overflow-x-auto md:block">
              <ApiKeysTable
                apiKeys={apiKeys}
                copiedKeyId={copiedKeyId}
                disabled={isMutating}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                visibleColumns={visibleColumns}
              />
            </div>
            <DataPagination
              disabled={isLoading || isMutating}
              metadata={pagination}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(DEFAULT_PAGE);
              }}
            />
          </>
        )}
      </Card>

      <ApiKeyDialog
        apiKey={editingApiKey}
        isSaving={isMutating}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        open={dialogOpen}
      />
      <ApiKeyCreatedDialog created={createdApiKey} onClose={() => setCreatedApiKey(null)} />
    </>
  );
}
