import { Box, Clock3, DollarSign, Files } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const summaryCards = [
  {
    key: 'requests',
    value: '35,235',
    icon: Files,
    iconClassName: 'bg-primary/10 text-primary',
    detailKey: 'requestScope',
  },
  {
    key: 'tokens',
    value: '3.18B',
    icon: Box,
    iconClassName: 'bg-warning/12 text-warning',
    detailKey: 'tokenBreakdown',
  },
  {
    key: 'cost',
    value: 'US$11.6948',
    icon: DollarSign,
    iconClassName: 'bg-success/12 text-success',
    detailKey: 'standardCost',
  },
  {
    key: 'latency',
    value: '22.30s',
    icon: Clock3,
    iconClassName: 'bg-chart-4/12 text-chart-4',
    detailKey: 'latencyDetail',
  },
] as const;

export function UsageSummaryCards() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((item) => {
        const Icon = item.icon;

        return (
          <Card className="gap-0 py-0 shadow-sm" key={item.key}>
            <CardContent className="flex min-h-28 items-center gap-4 p-4">
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-lg',
                  item.iconClassName,
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">
                  {t(`pages.account.sections.usage.stats.${item.key}`)}
                </span>
                <strong className="mt-1 block font-mono text-xl tabular-nums tracking-tight">
                  {item.value}
                </strong>
                <small className="mt-1 block text-xs leading-4 text-muted-foreground">
                  {t(`pages.account.sections.usage.stats.${item.detailKey}`)}
                </small>
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
