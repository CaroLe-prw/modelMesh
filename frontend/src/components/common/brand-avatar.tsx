import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { brandAvatarDataUrl } from '@/features/account/api/brand-presets';
import { cn } from '@/lib/utils';

const avatarSizes = {
  default: 'size-9 rounded-lg',
  picker: 'size-14 rounded-xl',
  preview: 'size-11 rounded-xl',
} as const;

export function BrandAvatar({
  className,
  size = 'default',
  src,
  svg,
}: {
  className?: string;
  size?: keyof typeof avatarSizes;
  src?: string;
  svg?: string;
}) {
  const imageSource = src ?? (svg ? brandAvatarDataUrl(svg) : undefined);

  return (
    <Avatar className={cn(avatarSizes[size], 'border border-border bg-background', className)}>
      {imageSource && (
        <AvatarImage alt="" className={cn('object-contain', src && 'p-1')} src={imageSource} />
      )}
      <AvatarFallback className="rounded-[inherit] bg-primary/10 text-primary">
        <Building2 aria-hidden="true" className="size-5" />
      </AvatarFallback>
    </Avatar>
  );
}
