import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarUrl?: string;
  className?: string;
  fallbackClassName?: string;
  name: string;
}

export function UserAvatar({ avatarUrl, className, fallbackClassName, name }: UserAvatarProps) {
  const fallback = name.slice(0, 2).toUpperCase() || 'MM';

  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage alt={name} src={avatarUrl} />}
      <AvatarFallback className={cn('bg-primary/10 font-semibold text-primary', fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
