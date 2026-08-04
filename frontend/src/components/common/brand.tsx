import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  const { t } = useTranslation();

  return (
    <Link
      className="inline-flex items-center gap-2.5 text-foreground no-underline"
      to="/"
      aria-label={t('common.brandHome')}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-secondary">
        <img className="h-5 w-5" src="/favicon.svg" alt="" aria-hidden="true" />
      </span>
      <span
        className={cn('text-[15px] font-bold tracking-[-0.025em]', compact && 'hidden sm:inline')}
      >
        ModelMesh
      </span>
      {!compact && (
        <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.14em] text-muted-foreground sm:inline">
          OPEN
        </span>
      )}
    </Link>
  );
}
