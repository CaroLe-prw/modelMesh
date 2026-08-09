import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'bg-card text-destructive [&>[data-slot=alert-description]]:text-destructive/90 [&>svg]:text-current',
        success:
          'border-success/25 bg-card text-success [&>[data-slot=alert-description]]:text-success/90 [&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface AlertProps extends ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('col-start-2 min-h-4 line-clamp-1 font-medium tracking-tight', className)}
      data-slot="alert-title"
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      data-slot="alert-description"
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
