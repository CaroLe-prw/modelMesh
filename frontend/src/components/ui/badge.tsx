import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
