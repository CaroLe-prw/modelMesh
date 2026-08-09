import { Building2, Check, Cpu, KeyRound, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { brands, catalogModels, formatUsd, tokenOptions, type BrandId } from '../data/marketplace';

interface CatalogSelectionPanelProps {
  selectedBrandId: BrandId;
  selectedModelId: string;
  selectedTokenId: string;
  onBrandChange: (brandId: BrandId) => void;
  onModelChange: (modelId: string) => void;
  onTokenChange: (tokenId: string) => void;
}

export function CatalogSelectionPanel({
  selectedBrandId,
  selectedModelId,
  selectedTokenId,
  onBrandChange,
  onModelChange,
  onTokenChange,
}: CatalogSelectionPanelProps) {
  const { t } = useTranslation();
  const visibleModels = catalogModels.filter((model) => model.brandId === selectedBrandId);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-[0_20px_60px_color-mix(in_srgb,var(--color-text)_6%,transparent)]">
      <SelectionStage
        description={t('pages.models.explorer.brand.description')}
        icon={Building2}
        step="01"
        title={t('pages.models.explorer.brand.title')}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => {
            const isSelected = brand.id === selectedBrandId;

            return (
              <Button
                className={cn(
                  'h-auto min-h-20 justify-start whitespace-normal rounded-lg px-3 text-left',
                  isSelected && 'border-primary/40',
                )}
                aria-pressed={isSelected}
                key={brand.id}
                variant={isSelected ? 'secondary' : 'outline'}
                onClick={() => onBrandChange(brand.id)}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-lg font-mono text-xs font-bold',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {brand.mark}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-xs">{brand.name}</strong>
                  <small className="mt-1 block text-[9px] text-muted-foreground">
                    {t('pages.models.explorer.brand.merchantCount', {
                      count: brand.merchantCount,
                    })}
                  </small>
                </span>
              </Button>
            );
          })}
        </div>
      </SelectionStage>

      <SelectionStage
        description={t('pages.models.explorer.model.description')}
        icon={Cpu}
        step="02"
        title={t('pages.models.explorer.model.title')}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {visibleModels.map((model) => {
            const isSelected = model.id === selectedModelId;

            return (
              <Button
                className={cn(
                  'relative h-auto min-h-22 justify-start whitespace-normal rounded-lg p-3.5 text-left',
                  isSelected && 'border-primary/40',
                )}
                aria-pressed={isSelected}
                key={model.id}
                variant={isSelected ? 'secondary' : 'outline'}
                onClick={() => onModelChange(model.id)}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                )}
                <strong className="block pr-7 font-mono text-[11px]">{model.name}</strong>
                <span className="mt-3 block text-[9px] text-muted-foreground">
                  {t('pages.models.explorer.model.inputFrom', {
                    price: formatUsd(model.inputFrom),
                  })}
                </span>
                <span className="mt-1.5 block text-[9px] text-muted-foreground">
                  {t('pages.models.explorer.model.merchantCount', {
                    count: model.merchantCount,
                  })}
                </span>
              </Button>
            );
          })}
        </div>
      </SelectionStage>

      <SelectionStage
        description={t('pages.models.explorer.token.description')}
        icon={KeyRound}
        step="03"
        title={t('pages.models.explorer.token.title')}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          {tokenOptions.map((token) => {
            const isSelected = token.id === selectedTokenId;

            return (
              <Button
                className={cn(
                  'h-auto min-h-18 flex-1 justify-start whitespace-normal rounded-lg px-4 text-left',
                  isSelected && 'border-primary/40',
                )}
                aria-pressed={isSelected}
                key={token.id}
                variant={isSelected ? 'secondary' : 'outline'}
                onClick={() => onTokenChange(token.id)}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    token.status === 'active' ? 'bg-success' : 'bg-muted-foreground',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs">{token.name}</strong>
                  <small className="mt-1 block truncate font-mono text-[9px] text-muted-foreground">
                    {token.maskedKey}
                  </small>
                </span>
                <Badge
                  className={cn(
                    'h-5 px-2 text-[9px]',
                    token.status === 'active'
                      ? 'border-success/20 bg-success/8 text-success'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {t(`pages.models.explorer.token.${token.status}`)}
                </Badge>
              </Button>
            );
          })}
          <Button asChild className="min-h-18 min-w-36 border-dashed" variant="outline">
            <Link to="/register">
              <Plus aria-hidden="true" className="size-4" />
              {t('pages.models.explorer.token.create')}
            </Link>
          </Button>
        </div>
      </SelectionStage>
    </Card>
  );
}

interface SelectionStageProps {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  step: string;
  title: string;
}

function SelectionStage({ children, description, icon: Icon, step, title }: SelectionStageProps) {
  return (
    <CardContent className="border-b border-border p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold text-primary">{step}</span>
            <h2 className="text-sm font-bold">{title}</h2>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </CardContent>
  );
}
