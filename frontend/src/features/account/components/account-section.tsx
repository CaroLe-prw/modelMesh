import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface AccountSectionHeaderProps {
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}

export function AccountSectionHeader({
  description,
  eyebrow,
  icon: Icon,
  title,
}: AccountSectionHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-2 text-primary">
        <span className="grid size-7 place-items-center rounded-md bg-primary/10">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-[0.1em]">{eyebrow}</span>
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}

interface AccountPreviewPanelProps {
  badge: string;
  children?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}

export function AccountPreviewPanel({
  badge,
  children,
  description,
  icon: Icon,
  title,
}: AccountPreviewPanelProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-[0_18px_50px_color-mix(in_srgb,var(--color-text)_5%,transparent)]">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <span>
            <strong className="block text-base">{title}</strong>
            <small className="mt-1 block text-xs leading-5 text-muted-foreground">
              {description}
            </small>
          </span>
        </div>
        <Badge className="self-start border-primary/20 bg-primary/8 text-primary" variant="outline">
          {badge}
        </Badge>
      </div>
      <div className="p-5">
        {children ?? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div className="rounded-lg border border-border bg-secondary/45 p-4" key={item}>
                <span className="block h-2 w-16 rounded-full bg-primary/15" />
                <span className="mt-4 block h-3 w-24 rounded-full bg-muted-foreground/15" />
                <span className="mt-2 block h-2 w-full rounded-full bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
