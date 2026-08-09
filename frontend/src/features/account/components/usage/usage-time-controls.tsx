import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UsageTimeControls() {
  const { t } = useTranslation();

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full items-end gap-3 sm:w-auto">
          <span className="mb-0.5 hidden size-9 place-items-center rounded-md bg-primary/10 text-primary sm:grid">
            <CalendarClock aria-hidden="true" className="size-4" />
          </span>
          <div className="grid w-full gap-1.5 sm:w-auto">
            <Label className="text-xs text-muted-foreground">
              {t('pages.account.sections.usage.timeRange')}
            </Label>
            <Select defaultValue="24h">
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">
                  {t('pages.account.sections.usage.ranges.last24Hours')}
                </SelectItem>
                <SelectItem value="7d">
                  {t('pages.account.sections.usage.ranges.last7Days')}
                </SelectItem>
                <SelectItem value="30d">
                  {t('pages.account.sections.usage.ranges.last30Days')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('pages.account.sections.usage.granularity')}
          </Label>
          <Select defaultValue="hour">
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">
                {t('pages.account.sections.usage.granularities.hour')}
              </SelectItem>
              <SelectItem value="day">
                {t('pages.account.sections.usage.granularities.day')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
