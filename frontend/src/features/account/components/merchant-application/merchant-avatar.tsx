import { Store } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function MerchantAvatar({
  alt,
  className,
  onLoadError,
  src,
}: {
  alt: string;
  className?: string;
  onLoadError?: () => void;
  src?: string | null;
}) {
  return (
    <Avatar
      className={cn('size-14 rounded-xl border border-border bg-background shadow-xs', className)}
    >
      {src ? <AvatarImage alt={alt} onError={onLoadError} src={src} /> : null}
      <AvatarFallback className="rounded-[inherit] bg-primary/10 text-primary">
        <Store aria-hidden="true" className="size-5" />
      </AvatarFallback>
    </Avatar>
  );
}
