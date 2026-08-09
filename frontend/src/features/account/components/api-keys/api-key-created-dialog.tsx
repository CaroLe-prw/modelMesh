import { Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CreatedApiKey } from '@/features/account/api/api-keys';

interface ApiKeyCreatedDialogProps {
  created: CreatedApiKey | null;
  onClose: () => void;
}

export function ApiKeyCreatedDialog({ created, onClose }: ApiKeyCreatedDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copyPlainTextKey() {
    if (!created) {
      return;
    }

    try {
      await navigator.clipboard.writeText(created.plainTextKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function close() {
    setCopied(false);
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      close();
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={created !== null}>
      <DialogContent
        closeLabel={t('pages.account.sections.apiKeys.createdDialog.close')}
        className="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t('pages.account.sections.apiKeys.createdDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.apiKeys.createdDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="success">
          <KeyRound aria-hidden="true" />
          <AlertTitle>{created?.apiKey.name}</AlertTitle>
          <AlertDescription>
            <code className="mt-2 block w-full break-all rounded-lg bg-secondary p-3 font-mono text-xs text-foreground">
              {created?.plainTextKey}
            </code>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button onClick={copyPlainTextKey} type="button" variant="outline">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {t(
              copied
                ? 'pages.account.sections.apiKeys.createdDialog.copied'
                : 'pages.account.sections.apiKeys.createdDialog.copy',
            )}
          </Button>
          <Button onClick={close} type="button">
            {t('pages.account.sections.apiKeys.createdDialog.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
