import { RadioTower, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MerchantChannelModelSelectorProps {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  availableModels: string[];
  disabled: boolean;
  emptyText: string;
  id: string;
  onValueChange: (models: string[]) => void;
  providerName: string;
  searchPlaceholder: string;
  selectionSummary: string;
  toggleAllLabel: string;
  value: string[];
}

export function MerchantChannelModelSelector({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  availableModels,
  disabled,
  emptyText,
  id,
  onValueChange,
  providerName,
  searchPlaceholder,
  selectionSummary,
  toggleAllLabel,
  value,
}: MerchantChannelModelSelectorProps) {
  const [query, setQuery] = useState('');
  const selectedModels = useMemo(() => new Set(value), [value]);
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return availableModels;
    return availableModels.filter((model) => model.toLocaleLowerCase().includes(normalizedQuery));
  }, [availableModels, query]);
  const allSelected = availableModels.every((model) => selectedModels.has(model));
  const someSelected = availableModels.some((model) => selectedModels.has(model));

  function updateModel(model: string, checked: boolean) {
    const nextModels = new Set(selectedModels);
    if (checked) nextModels.add(model);
    else nextModels.delete(model);
    onValueChange(availableModels.filter((item) => nextModels.has(item)));
  }

  function updateAll(checked: boolean) {
    onValueChange(checked ? [...availableModels] : []);
  }

  return (
    <div
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid || undefined}
      className="grid gap-3"
      id={id}
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label={searchPlaceholder}
          className="h-10 pl-9"
          disabled={disabled}
          id={`${id}-search`}
          name="models"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={query}
        />
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card',
          ariaInvalid && 'border-destructive',
        )}
      >
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-muted/35 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <RadioTower aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {providerName} <span className="font-normal">({availableModels.length})</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{selectionSummary}</p>
            </div>
          </div>
          <Checkbox
            aria-label={toggleAllLabel}
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            className="size-5"
            disabled={disabled}
            onCheckedChange={(checked) => updateAll(checked === true)}
          />
        </div>

        {filteredModels.length > 0 ? (
          <div className="grid max-h-80 grid-cols-1 gap-x-6 overflow-y-auto p-2 sm:grid-cols-2">
            {filteredModels.map((model) => {
              const optionId = `${id}-${encodeURIComponent(model)}`;
              return (
                <div
                  className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                  key={model}
                >
                  <Checkbox
                    checked={selectedModels.has(model)}
                    disabled={disabled}
                    id={optionId}
                    onCheckedChange={(checked) => updateModel(model, checked === true)}
                  />
                  <Label className="min-w-0 flex-1 cursor-pointer" htmlFor={optionId}>
                    <span className="min-w-0 break-all font-mono text-sm font-normal leading-5">
                      {model}
                    </span>
                  </Label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
