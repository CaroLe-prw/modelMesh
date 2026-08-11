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

export function SearchableSelect({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  disabled,
  emptyText,
  id,
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
  name?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  value?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(
    () => filterSearchableSelectOptions(options, query),
    [options, query],
  );
  const listboxId = `${id}-listbox`;

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
          aria-controls={open ? listboxId : undefined}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          className={cn('w-full justify-between px-3 font-normal', className)}
          disabled={disabled}
          id={id}
          name={name}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className={cn('min-w-0 truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption?.label ?? placeholder}
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
          className="max-h-64 touch-pan-y overflow-y-auto overscroll-contain p-1"
          id={listboxId}
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === value;
              return (
                <Button
                  aria-selected={selected}
                  className="h-auto w-full justify-start gap-3 whitespace-normal px-2 py-2 text-left font-normal"
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  role="option"
                  type="button"
                  variant="ghost"
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
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
