import { Boxes, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatMerchantDate,
  formatUsd,
  merchantModels,
  type MerchantModel,
  type MerchantModelStatus,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

type ModelStatusFilter = 'all' | MerchantModelStatus;
const modelStatusFilters: ModelStatusFilter[] = ['all', 'published', 'review', 'draft'];

export function MerchantModelsPanel() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ModelStatusFilter>('all');
  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return merchantModels.filter((model) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        model.model.toLocaleLowerCase().includes(normalizedQuery) ||
        model.channel.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || model.status === status);
    });
  }, [query, status]);

  function showPreviewNotice() {
    toast.info(t('pages.account.sections.merchant.previewAction'));
  }

  return (
    <div className="grid min-w-0 gap-3">
      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t('pages.account.sections.merchant.models.search')}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('pages.account.sections.merchant.models.search')}
              value={query}
            />
          </div>
          <Select onValueChange={(value) => setStatus(value as ModelStatusFilter)} value={status}>
            <SelectTrigger
              aria-label={t('pages.account.sections.merchant.models.statusFilter')}
              className="w-full md:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelStatusFilters.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.account.sections.merchant.models.statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={showPreviewNotice}>
            <Plus aria-hidden="true" />
            {t('pages.account.sections.merchant.models.add')}
          </Button>
        </div>
      </Card>

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">
            {t('pages.account.sections.merchant.models.caption')}
          </TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              <TableHead className="h-12 min-w-48 px-4">
                {t('pages.account.sections.merchant.models.columns.model')}
              </TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.models.columns.channel')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.models.columns.context')}</TableHead>
              <TableHead>
                {t('pages.account.sections.merchant.models.columns.inputPrice')}
              </TableHead>
              <TableHead>
                {t('pages.account.sections.merchant.models.columns.outputPrice')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.models.columns.status')}</TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.models.columns.updatedAt')}
              </TableHead>
              <TableHead className="w-20 text-right">
                {t('pages.account.sections.merchant.models.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleModels.map((model) => (
              <ModelTableRow key={model.id} model={model} onManage={showPreviewNotice} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {visibleModels.map((model) => (
          <ModelMobileCard key={model.id} model={model} onManage={showPreviewNotice} />
        ))}
      </div>

      {visibleModels.length === 0 ? (
        <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
          <Boxes aria-hidden="true" className="size-6 text-muted-foreground" />
          <strong className="mt-4 text-sm">
            {t('pages.account.sections.merchant.models.empty')}
          </strong>
        </Card>
      ) : null}
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}

function ModelTableRow({ model, onManage }: { model: MerchantModel; onManage: () => void }) {
  const { i18n, t } = useTranslation();

  return (
    <TableRow className="h-16">
      <TableCell className="px-4 font-mono text-xs font-semibold">{model.model}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{model.channel}</TableCell>
      <TableCell className="font-mono">{model.contextWindow}</TableCell>
      <TableCell className="font-mono text-xs">
        {formatUsd(i18n.resolvedLanguage, model.inputPrice)}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {formatUsd(i18n.resolvedLanguage, model.outputPrice)}
      </TableCell>
      <TableCell>
        <MerchantStatusBadge namespace="models" status={model.status} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, model.updatedAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          aria-label={t('pages.account.sections.merchant.models.manageLabel', {
            name: model.model,
          })}
          onClick={onManage}
          size="icon-sm"
          variant="ghost"
        >
          <SlidersHorizontal aria-hidden="true" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ModelMobileCard({ model, onManage }: { model: MerchantModel; onManage: () => void }) {
  const { i18n, t } = useTranslation();

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate font-mono text-sm">{model.model}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">{model.channel}</span>
        </div>
        <Button
          aria-label={t('pages.account.sections.merchant.models.manageLabel', {
            name: model.model,
          })}
          onClick={onManage}
          size="icon-sm"
          variant="ghost"
        >
          <SlidersHorizontal aria-hidden="true" />
        </Button>
      </div>
      <MerchantStatusBadge namespace="models" status={model.status} />
      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/45 p-3 text-xs">
        <ModelMetric
          label={t('pages.account.sections.merchant.models.columns.context')}
          value={model.contextWindow}
        />
        <ModelMetric
          label={t('pages.account.sections.merchant.models.columns.inputPrice')}
          value={formatUsd(i18n.resolvedLanguage, model.inputPrice)}
        />
        <ModelMetric
          label={t('pages.account.sections.merchant.models.columns.outputPrice')}
          value={formatUsd(i18n.resolvedLanguage, model.outputPrice)}
        />
      </dl>
    </Card>
  );
}

function ModelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono font-semibold">{value}</dd>
    </div>
  );
}
