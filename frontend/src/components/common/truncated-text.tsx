import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function TruncatedText({ className, text }: { className?: string; text: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  const measureOverflow = useCallback(() => {
    const element = textRef.current;
    if (!element) return;
    const nextOverflowing = element.scrollWidth > element.clientWidth + 1;
    setIsOverflowing(nextOverflowing);
    if (!nextOverflowing) setOpen(false);
  }, []);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    measureOverflow();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureOverflow);
      return () => window.removeEventListener('resize', measureOverflow);
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureOverflow, text]);

  return (
    <Tooltip open={open} onOpenChange={(nextOpen) => setOpen(nextOpen && isOverflowing)}>
      <TooltipTrigger asChild>
        <span
          className={cn('block min-w-0 truncate', className)}
          onFocus={measureOverflow}
          onPointerEnter={measureOverflow}
          ref={textRef}
          tabIndex={isOverflowing ? 0 : undefined}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
