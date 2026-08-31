import { Check, ChevronsUpDown, LoaderCircle, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { RadioCardItem } from '@/components/common/radio-card-item';
import {
  filterSearchableSelectOptions,
  type SearchableSelectOption,
} from '@/components/common/searchable-select-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export function SearchableSelect({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  disabled,
  emptyText,
  id,
  loading = false,
  loadingText,
  name,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  value,
}: {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
  disabled?: boolean;
  emptyText: string;
  id: string;
  loading?: boolean;
  loadingText?: string;
  name?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  value?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(
    () => filterSearchableSelectOptions(options, query),
    [options, query],
  );
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  }

  function selectOption(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover modal onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-describedby={ariaDescribedBy}
          aria-busy={loading || undefined}
          aria-invalid={ariaInvalid}
          className={cn('w-full justify-between px-3 font-normal', className)}
          disabled={disabled}
          id={id}
          name={name}
          type="button"
          variant="outline"
        >
          <span className={cn('min-w-0 truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption?.label ?? placeholder}
          </span>
          {loading ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-muted-foreground"
            />
          ) : (
            <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <div className="relative border-b border-border p-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={searchPlaceholder}
            autoComplete="off"
            className="pl-9"
            disabled={loading}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown' || !firstOptionRef.current) return;
              event.preventDefault();
              firstOptionRef.current.focus();
            }}
            placeholder={searchPlaceholder}
            value={query}
          />
        </div>
        <RadioGroup
          aria-label={placeholder}
          className="max-h-64 touch-pan-y gap-0 overflow-y-auto overscroll-contain p-1"
          onValueChange={selectOption}
          value={value}
        >
          {loading ? (
            <div
              aria-live="polite"
              className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              <span>{loadingText ?? placeholder}</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            filteredOptions.map((option, index) => {
              const selected = option.value === value;
              return (
                <RadioCardItem
                  className="min-h-9 justify-start gap-3 rounded-sm border-0 px-2 py-2 text-left font-normal shadow-none hover:bg-accent peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground"
                  id={`${id}-option-${option.value}`}
                  key={option.value}
                  ref={index === 0 ? firstOptionRef : undefined}
                  value={option.value}
                >
                  <Check
                    aria-hidden="true"
                    className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </RadioCardItem>
              );
            })
          )}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  );
}
