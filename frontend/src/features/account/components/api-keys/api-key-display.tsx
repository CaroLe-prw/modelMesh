import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';

interface ApiKeyMaskedValueProps {
  apiKey: ApiKeyItem;
  copied: boolean;
  onCopy: (apiKey: ApiKeyItem) => void;
}

export function ApiKeyMaskedValue({ apiKey, copied, onCopy }: ApiKeyMaskedValueProps) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <code className="truncate rounded-md bg-secondary px-2 py-1 font-mono text-xs text-primary">
        {apiKey.maskedKey}
      </code>
      <Button
        aria-label={t('pages.account.sections.apiKeys.actions.copy', {
          name: apiKey.name,
        })}
        className={copied ? 'text-success' : 'text-muted-foreground'}
        onClick={() => onCopy(apiKey)}
        size="icon-xs"
        title={t('pages.account.sections.apiKeys.actions.copy', {
          name: apiKey.name,
        })}
        variant="ghost"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </span>
  );
}

export function ApiKeyStatusBadge({ status }: Pick<ApiKeyItem, 'status'>) {
  const { t } = useTranslation();

  return (
    <Badge
      className={
        status === 'active'
          ? 'border-success/20 bg-success/10 text-success'
          : 'border-border bg-secondary text-muted-foreground'
      }
      variant="outline"
    >
      <span
        aria-hidden="true"
        className={
          status === 'active'
            ? 'size-1.5 rounded-full bg-success'
            : 'size-1.5 rounded-full bg-muted-foreground'
        }
      />
      {t(`pages.account.sections.apiKeys.statuses.${status}`)}
    </Badge>
  );
}
