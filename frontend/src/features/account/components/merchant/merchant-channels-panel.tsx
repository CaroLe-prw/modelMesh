import { Plus, RadioTower, Search, Settings2 } from 'lucide-react';
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
  merchantChannels,
  type MerchantChannel,
  type MerchantChannelStatus,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

type ChannelStatusFilter = 'all' | MerchantChannelStatus;
const channelStatusFilters: ChannelStatusFilter[] = ['all', 'active', 'degraded', 'offline'];

export function MerchantChannelsPanel() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ChannelStatusFilter>('all');
  const visibleChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return merchantChannels.filter((channel) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        channel.name.toLocaleLowerCase().includes(normalizedQuery) ||
        channel.provider.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (status === 'all' || channel.status === status);
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
              aria-label={t('pages.account.sections.merchant.channels.search')}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('pages.account.sections.merchant.channels.search')}
              value={query}
            />
          </div>
          <Select onValueChange={(value) => setStatus(value as ChannelStatusFilter)} value={status}>
            <SelectTrigger
              aria-label={t('pages.account.sections.merchant.channels.statusFilter')}
              className="w-full md:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channelStatusFilters.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.account.sections.merchant.channels.statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={showPreviewNotice}>
            <Plus aria-hidden="true" />
            {t('pages.account.sections.merchant.channels.add')}
          </Button>
        </div>
      </Card>

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">
            {t('pages.account.sections.merchant.channels.caption')}
          </TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              <TableHead className="h-12 min-w-52 px-4">
                {t('pages.account.sections.merchant.channels.columns.channel')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.channels.columns.status')}</TableHead>
              <TableHead>{t('pages.account.sections.merchant.channels.columns.models')}</TableHead>
              <TableHead>
                {t('pages.account.sections.merchant.channels.columns.successRate')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.channels.columns.latency')}</TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.channels.columns.updatedAt')}
              </TableHead>
              <TableHead className="w-20 text-right">
                {t('pages.account.sections.merchant.channels.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleChannels.map((channel) => (
              <ChannelTableRow channel={channel} key={channel.id} onManage={showPreviewNotice} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {visibleChannels.map((channel) => (
          <ChannelMobileCard channel={channel} key={channel.id} onManage={showPreviewNotice} />
        ))}
      </div>

      {visibleChannels.length === 0 ? (
        <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
          <RadioTower aria-hidden="true" className="size-6 text-muted-foreground" />
          <strong className="mt-4 text-sm">
            {t('pages.account.sections.merchant.channels.empty')}
          </strong>
        </Card>
      ) : null}
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}

function ChannelTableRow({
  channel,
  onManage,
}: {
  channel: MerchantChannel;
  onManage: () => void;
}) {
  const { i18n, t } = useTranslation();

  return (
    <TableRow className="h-16">
      <TableCell className="px-4">
        <strong className="block text-sm">{channel.name}</strong>
        <span className="mt-1 block text-xs text-muted-foreground">{channel.provider}</span>
      </TableCell>
      <TableCell>
        <MerchantStatusBadge namespace="channels" status={channel.status} />
      </TableCell>
      <TableCell className="font-mono">{channel.modelCount}</TableCell>
      <TableCell className="font-mono">{channel.successRate.toFixed(2)}%</TableCell>
      <TableCell className="font-mono">
        {channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—'}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, channel.updatedAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          aria-label={t('pages.account.sections.merchant.channels.manageLabel', {
            name: channel.name,
          })}
          onClick={onManage}
          size="icon-sm"
          variant="ghost"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ChannelMobileCard({
  channel,
  onManage,
}: {
  channel: MerchantChannel;
  onManage: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm">{channel.name}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">{channel.provider}</span>
        </div>
        <Button
          aria-label={t('pages.account.sections.merchant.channels.manageLabel', {
            name: channel.name,
          })}
          onClick={onManage}
          size="icon-sm"
          variant="ghost"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </div>
      <MerchantStatusBadge namespace="channels" status={channel.status} />
      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/45 p-3 text-xs">
        <Metric
          label={t('pages.account.sections.merchant.channels.columns.models')}
          value={String(channel.modelCount)}
        />
        <Metric
          label={t('pages.account.sections.merchant.channels.columns.successRate')}
          value={`${channel.successRate.toFixed(2)}%`}
        />
        <Metric
          label={t('pages.account.sections.merchant.channels.columns.latency')}
          value={channel.latencyMs > 0 ? `${channel.latencyMs} ms` : '—'}
        />
      </dl>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono font-semibold">{value}</dd>
    </div>
  );
}
