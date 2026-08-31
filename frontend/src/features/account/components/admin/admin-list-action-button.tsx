import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminListActionButton({
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
      title={label}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
