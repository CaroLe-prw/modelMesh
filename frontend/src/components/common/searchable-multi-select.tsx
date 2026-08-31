import { ChevronsUpDown, LoaderCircle, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  filterSearchableSelectOptions,
  type SearchableSelectOption,
} from '@/components/common/searchable-select-options';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function SearchableMultiSelect({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  disabled,
  emptyText,
  id,
  loading = false,
  loadingText,
  maxSelected,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  selectedCountText,
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
  maxSelected?: number;
  onValueChange: (value: string[]) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  selectedCountText: (count: number) => string;
  value: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const selected = new Set(value);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const filteredOptions = useMemo(
    () => filterSearchableSelectOptions(options, query),
    [options, query],
  );
  const triggerText =
    selectedOptions.length === 1
      ? selectedOptions[0]?.label
      : selectedOptions.length > 1
        ? selectedCountText(selectedOptions.length)
        : placeholder;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  }

  function toggleOption(optionValue: string) {
    if (selected.has(optionValue)) {
      onValueChange(value.filter((item) => item !== optionValue));
      return;
    }
    if (maxSelected !== undefined && value.length >= maxSelected) return;
    onValueChange([...value, optionValue]);
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
          type="button"
          variant="outline"
        >
          <span className={cn('min-w-0 truncate', value.length === 0 && 'text-muted-foreground')}>
            {triggerText}
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
        <div className="max-h-64 touch-pan-y overflow-y-auto overscroll-contain p-1">
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
              const isSelected = selected.has(option.value);
              const selectionLimitReached =
                !isSelected && maxSelected !== undefined && value.length >= maxSelected;
              const optionId = `${id}-option-${option.value}`;
              return (
                <div
                  className="flex min-h-9 items-center gap-3 rounded-sm px-2 py-2 hover:bg-accent focus-within:bg-accent"
                  key={option.value}
                >
                  <Checkbox
                    checked={isSelected}
                    className="peer"
                    disabled={selectionLimitReached}
                    id={optionId}
                    onCheckedChange={() => toggleOption(option.value)}
                    ref={index === 0 ? firstOptionRef : undefined}
                  />
                  <Label
                    className="min-w-0 flex-1 cursor-pointer font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                    htmlFor={optionId}
                  >
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </Label>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
