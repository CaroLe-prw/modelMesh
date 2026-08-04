import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        outline:
          'border border-border bg-card text-foreground hover:border-border-strong hover:bg-accent',
        ghost:
          'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
        soft: 'border border-transparent bg-primary/10 text-primary hover:bg-primary/15',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        xl: 'h-12 rounded-lg px-7 text-sm',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);
