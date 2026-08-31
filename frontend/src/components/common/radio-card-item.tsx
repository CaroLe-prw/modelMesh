import type { ComponentProps, ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface RadioCardItemProps extends Omit<
  ComponentProps<typeof RadioGroupItem>,
  'children' | 'className' | 'id'
> {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id: string;
}

export function RadioCardItem({
  children,
  className,
  containerClassName,
  id,
  ...props
}: RadioCardItemProps) {
  return (
    <div className={cn('relative min-w-0', containerClassName)}>
      <RadioGroupItem className="peer sr-only" id={id} {...props} />
      <Label
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-auto w-full cursor-pointer whitespace-normal peer-data-[state=checked]:border-primary/40 peer-data-[state=checked]:bg-secondary peer-data-[state=checked]:text-secondary-foreground peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:pointer-events-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          className,
        )}
        htmlFor={id}
      >
        {children}
      </Label>
    </div>
  );
}
