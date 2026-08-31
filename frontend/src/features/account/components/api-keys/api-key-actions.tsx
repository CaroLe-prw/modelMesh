import { PauseCircle, Pencil, PlayCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';

interface ApiKeyActionsProps {
  apiKey: ApiKeyItem;
  disabled?: boolean;
  onDelete: (apiKey: ApiKeyItem) => void;
  onEdit: (apiKey: ApiKeyItem) => void;
  onToggleStatus: (apiKey: ApiKeyItem) => void;
}

const actionClassName =
  'h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-muted-foreground hover:bg-primary/8 hover:text-primary';
const destructiveActionClassName =
  'h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive';

export function ApiKeyActions({
  apiKey,
  disabled = false,
  onDelete,
  onEdit,
  onToggleStatus,
}: ApiKeyActionsProps) {
  const { t } = useTranslation();
  const isActive = apiKey.status === 'active';

  return (
    <div className="flex items-center justify-end gap-0.5 md:justify-center">
      <Button
        aria-label={t('pages.account.sections.apiKeys.actions.edit', {
          name: apiKey.name,
        })}
        className={actionClassName}
        disabled={disabled}
        onClick={() => onEdit(apiKey)}
        title={t('pages.account.sections.apiKeys.actions.edit', {
          name: apiKey.name,
        })}
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden="true" />
        <span className="text-[11px] leading-none">
          {t('pages.account.sections.apiKeys.actionLabels.edit')}
        </span>
      </Button>

      <Button
        aria-label={t(
          isActive
            ? 'pages.account.sections.apiKeys.actions.pause'
            : 'pages.account.sections.apiKeys.actions.resume',
          { name: apiKey.name },
        )}
        className={actionClassName}
        disabled={disabled}
        onClick={() => onToggleStatus(apiKey)}
        title={t(
          isActive
            ? 'pages.account.sections.apiKeys.actions.pause'
            : 'pages.account.sections.apiKeys.actions.resume',
          { name: apiKey.name },
        )}
        type="button"
        variant="ghost"
      >
        {isActive ? <PauseCircle aria-hidden="true" /> : <PlayCircle aria-hidden="true" />}
        <span className="text-[11px] leading-none">
          {t(
            isActive
              ? 'pages.account.sections.apiKeys.actionLabels.pause'
              : 'pages.account.sections.apiKeys.actionLabels.resume',
          )}
        </span>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={t('pages.account.sections.apiKeys.actions.delete', {
              name: apiKey.name,
            })}
            className={destructiveActionClassName}
            disabled={disabled}
            title={t('pages.account.sections.apiKeys.actions.delete', {
              name: apiKey.name,
            })}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            <span className="text-[11px] leading-none">
              {t('pages.account.sections.apiKeys.actionLabels.delete')}
            </span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pages.account.sections.apiKeys.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pages.account.sections.apiKeys.deleteDialog.description', {
                name: apiKey.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('pages.account.sections.apiKeys.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => onDelete(apiKey)}
              variant="destructive"
            >
              {t('pages.account.sections.apiKeys.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
