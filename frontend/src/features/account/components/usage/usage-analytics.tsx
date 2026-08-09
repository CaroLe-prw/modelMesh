import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  apiKeyDistribution,
  endpointDistribution,
  modelDistribution,
  tokenTrend,
  type UsageDistributionDatum,
} from '@/features/account/components/usage/usage-data';

const distributionColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

const trendConfig = {
  input: {
    label: 'Input',
    color: 'var(--chart-1)',
  },
  output: {
    label: 'Output',
    color: 'var(--chart-2)',
  },
  cacheRead: {
    label: 'Cache Read',
    color: 'var(--chart-3)',
  },
  cacheWrite: {
    label: 'Cache Write',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

type DistributionMetric = 'tokens' | 'cost';

interface DistributionCardProps {
  data: UsageDistributionDatum[];
  title: string;
}

function compactNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function DistributionCard({ data, title }: DistributionCardProps) {
  const { i18n, t } = useTranslation();
  const [metric, setMetric] = useState<DistributionMetric>('tokens');
  const total = data.reduce((sum, item) => sum + item[metric], 0);
  const chartData = data.map((item, index) => ({
    ...item,
    fill: distributionColors[index % distributionColors.length],
    value: item[metric],
  }));
  const chartConfig = {
    value: {
      label: t(`pages.account.sections.usage.charts.metrics.${metric}`),
    },
  } satisfies ChartConfig;

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="border-b border-border px-4 py-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction className="flex rounded-md bg-secondary p-0.5">
          {(['tokens', 'cost'] as const).map((option) => (
            <Button
              className="h-7 px-2.5 text-xs"
              key={option}
              onClick={() => setMetric(option)}
              size="sm"
              variant={metric === option ? 'outline' : 'ghost'}
            >
              {t(`pages.account.sections.usage.charts.metrics.${option}`)}
            </Button>
          ))}
        </CardAction>
      </CardHeader>
      <CardContent className="grid items-center gap-2 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <ChartContainer className="mx-auto h-[176px] w-full max-w-[190px]" config={chartConfig}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              cornerRadius={3}
              data={chartData}
              dataKey="value"
              innerRadius={48}
              nameKey="name"
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            />
          </PieChart>
        </ChartContainer>
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_64px_72px] gap-2 border-b border-border pb-2 text-[11px] text-muted-foreground">
            <span>{t('pages.account.sections.usage.charts.columns.name')}</span>
            <span className="text-right">
              {t('pages.account.sections.usage.charts.columns.requests')}
            </span>
            <span className="text-right">
              {t(`pages.account.sections.usage.charts.metrics.${metric}`)}
            </span>
          </div>
          {chartData.map((item) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_64px_72px] items-center gap-2 border-b border-border/70 py-2 text-xs last:border-0"
              key={item.name}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="truncate font-medium" title={item.name}>
                  {item.name}
                </span>
              </span>
              <span className="text-right font-mono tabular-nums text-muted-foreground">
                {compactNumber(item.requests, i18n.language)}
              </span>
              <span className="text-right font-mono tabular-nums text-success">
                {metric === 'cost'
                  ? `US$${item.cost.toFixed(2)}`
                  : compactNumber(item.tokens, i18n.language)}
              </span>
              <span
                aria-hidden="true"
                className="col-span-3 -mt-1 h-0.5 overflow-hidden rounded-full bg-secondary"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    backgroundColor: item.fill,
                    width: `${Math.max((item.value / total) * 100, 2)}%`,
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UsageAnalytics() {
  const { t } = useTranslation();
  const translatedTrendConfig: ChartConfig = {
    input: {
      ...trendConfig.input,
      label: t('pages.account.sections.usage.tokens.input'),
    },
    output: {
      ...trendConfig.output,
      label: t('pages.account.sections.usage.tokens.output'),
    },
    cacheRead: {
      ...trendConfig.cacheRead,
      label: t('pages.account.sections.usage.tokens.cacheRead'),
    },
    cacheWrite: {
      ...trendConfig.cacheWrite,
      label: t('pages.account.sections.usage.tokens.cacheWrite'),
    },
  };

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <DistributionCard
        data={modelDistribution}
        title={t('pages.account.sections.usage.charts.modelDistribution')}
      />
      <DistributionCard
        data={apiKeyDistribution}
        title={t('pages.account.sections.usage.charts.apiKeyDistribution')}
      />
      <DistributionCard
        data={endpointDistribution}
        title={t('pages.account.sections.usage.charts.endpointDistribution')}
      />
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b border-border px-4 py-4">
          <CardTitle className="text-sm">
            {t('pages.account.sections.usage.charts.tokenTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer className="h-[240px] w-full" config={translatedTrendConfig}>
            <LineChart data={tokenTrend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="time" tickLine={false} tickMargin={10} />
              <YAxis
                axisLine={false}
                tickFormatter={(value: number) => `${value}M`}
                tickLine={false}
                width={38}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full min-w-32 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {translatedTrendConfig[String(name)]?.label ?? String(name)}
                        </span>
                        <span className="font-mono font-medium">{String(value)}M</span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
              <Line
                dataKey="input"
                dot={false}
                stroke="var(--color-input)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="output"
                dot={false}
                stroke="var(--color-output)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="cacheRead"
                dot={false}
                stroke="var(--color-cacheRead)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="cacheWrite"
                dot={false}
                stroke="var(--color-cacheWrite)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
