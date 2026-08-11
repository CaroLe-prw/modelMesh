import { LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BrandPreset } from '@/features/account/api/brand-presets';
import { BrandAvatar } from '@/features/account/components/admin/brand-avatar';

export function KnownBrandPicker({
  existingIds,
  onCustom,
  onQueryChange,
  onRetry,
  onSelect,
  presets,
  query,
  status,
}: {
  existingIds: string[];
  onCustom: () => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  onSelect: (preset: BrandPreset) => void;
  presets: BrandPreset[];
  query: string;
  status: 'error' | 'loading' | 'ready';
}) {
  const { t } = useTranslation();
  const translationPath =
    'pages.account.sections.admin.catalogManagement.brands.createDialog.picker';
  const existingIdSet = useMemo(
    () => new Set(existingIds.map((id) => id.toLocaleLowerCase())),
    [existingIds],
  );
  const visiblePresets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return presets;

    return presets.filter((preset) =>
      [preset.name, preset.subtitle].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
    );
  }, [presets, query]);

  return (
    <div className="grid gap-4">
      <div>
        <strong className="text-sm">{t(`${translationPath}.title`)}</strong>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(`${translationPath}.description`)}
        </p>
      </div>
      {status === 'loading' && (
        <div className="grid min-h-40 place-items-center rounded-xl border border-border bg-secondary/25 text-center">
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">{t(`${translationPath}.loading`)}</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="grid min-h-40 place-items-center rounded-xl border border-border bg-secondary/25 px-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{t(`${translationPath}.loadError`)}</p>
            <Button className="mt-3" onClick={onRetry} size="sm" type="button" variant="outline">
              <RefreshCw aria-hidden="true" />
              {t(`${translationPath}.retry`)}
            </Button>
          </div>
        </div>
      )}
      {status === 'ready' && (
        <>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t(`${translationPath}.search`)}
              className="pl-9"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t(`${translationPath}.search`)}
              value={query}
            />
          </div>
          {visiblePresets.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {visiblePresets.map((preset) => {
                const isAdded = existingIdSet.has(preset.id);
                return (
                  <Button
                    className="h-auto min-w-0 justify-start gap-3 px-3 py-3 text-left whitespace-normal"
                    disabled={isAdded}
                    key={preset.id}
                    onClick={() => onSelect(preset)}
                    type="button"
                    variant="outline"
                  >
                    <BrandAvatar svg={preset.avatarSvg} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{preset.name}</strong>
                      <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                        {preset.subtitle}
                      </span>
                    </span>
                    {isAdded && <Badge variant="secondary">{t(`${translationPath}.added`)}</Badge>}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              {t(`${translationPath}.empty`)}
            </div>
          )}
        </>
      )}
      <Button className="border-dashed" onClick={onCustom} type="button" variant="outline">
        <Plus aria-hidden="true" />
        {t(`${translationPath}.custom`)}
      </Button>
    </div>
  );
}
