import { cn } from '@/lib/utils';

export type Signal = 'good' | 'warn' | 'bad';

const signalClasses: Record<Signal, string> = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-destructive',
};

interface SignalBarsProps {
  signals: Signal[];
}

export function SignalBars({ signals }: SignalBarsProps) {
  return (
    <span className="flex h-5 items-stretch gap-0.5" aria-hidden="true">
      {signals.map((signal, index) => (
        <span
          className={cn('w-1 rounded-[2px]', signalClasses[signal])}
          key={`${signal}-${index}`}
        />
      ))}
    </span>
  );
}
