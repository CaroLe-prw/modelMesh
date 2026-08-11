import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  filterSearchableSelectOptions,
  type SearchableSelectOption,
} from '@/components/common/searchable-select-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function SearchableMultiSelect({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  disabled,
  emptyText,
  id,
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
  const selected = new Set(value);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const filteredOptions = useMemo(
    () => filterSearchableSelectOptions(options, query),
    [options, query],
  );
  const listboxId = `${id}-listbox`;
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
          aria-controls={open ? listboxId : undefined}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          className={cn('w-full justify-between px-3 font-normal', className)}
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className={cn('min-w-0 truncate', value.length === 0 && 'text-muted-foreground')}>
            {triggerText}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            value={query}
          />
        </div>
        <div
          aria-multiselectable="true"
          className="max-h-64 touch-pan-y overflow-y-auto overscroll-contain p-1"
          id={listboxId}
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.has(option.value);
              const selectionLimitReached =
                !isSelected && maxSelected !== undefined && value.length >= maxSelected;
              return (
                <Button
                  aria-selected={isSelected}
                  className="h-auto w-full justify-start gap-3 whitespace-normal px-2 py-2 text-left font-normal"
                  disabled={selectionLimitReached}
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  role="option"
                  type="button"
                  variant="ghost"
                >
                  <Check
                    aria-hidden="true"
                    className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
