import { format, isValid } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExpirationDateTimePickerProps {
  id: string;
  onChange: (value: string) => void;
  value: string;
}

const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

function toDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function parseDateTimeLocalValue(value: string): Date | undefined {
  const date = new Date(value);
  return isValid(date) ? date : undefined;
}

export function ExpirationDateTimePicker({ id, onChange, value }: ExpirationDateTimePickerProps) {
  const { i18n, t } = useTranslation();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedDate = parseDateTimeLocalValue(value);
  const locale = i18n.resolvedLanguage?.startsWith('zh') ? zhCN : enUS;
  const hour = String(selectedDate?.getHours() ?? 0).padStart(2, '0');
  const minute = String(selectedDate?.getMinutes() ?? 0).padStart(2, '0');

  function updateTime(part: 'hour' | 'minute', nextValue: string) {
    if (!selectedDate) {
      return;
    }

    const nextDate = new Date(selectedDate);
    if (part === 'hour') {
      nextDate.setHours(Number(nextValue));
    } else {
      nextDate.setMinutes(Number(nextValue));
    }
    onChange(toDateTimeLocalValue(nextDate));
  }

  function updateDate(nextDay: Date | undefined) {
    if (!nextDay) {
      return;
    }

    const nextDate = new Date(nextDay);
    nextDate.setHours(selectedDate?.getHours() ?? 0, selectedDate?.getMinutes() ?? 0, 0, 0);
    onChange(toDateTimeLocalValue(nextDate));
    setCalendarOpen(false);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
      <Popover onOpenChange={setCalendarOpen} open={calendarOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label={t('pages.account.sections.apiKeys.dialog.expirationPicker.selectDate')}
            className="w-full justify-start px-3 text-left font-normal"
            id={id}
            type="button"
            variant="outline"
          >
            <CalendarIcon className="text-muted-foreground" />
            <span className="truncate">
              {selectedDate
                ? format(selectedDate, 'PPP', { locale })
                : t('pages.account.sections.apiKeys.dialog.expirationPicker.selectDate')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            autoFocus
            defaultMonth={selectedDate}
            locale={locale}
            mode="single"
            onSelect={updateDate}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>

      <Select onValueChange={(nextHour) => updateTime('hour', nextHour)} value={hour}>
        <SelectTrigger
          aria-label={t('pages.account.sections.apiKeys.dialog.expirationPicker.selectHour')}
          className="w-full font-mono tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64" position="popper">
          {hourOptions.map((option) => (
            <SelectItem className="font-mono tabular-nums" key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={(nextMinute) => updateTime('minute', nextMinute)} value={minute}>
        <SelectTrigger
          aria-label={t('pages.account.sections.apiKeys.dialog.expirationPicker.selectMinute')}
          className="w-full font-mono tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64" position="popper">
          {minuteOptions.map((option) => (
            <SelectItem className="font-mono tabular-nums" key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
