import { Inbox, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { CreateSupportTicketDialog } from '@/features/account/components/support/support-ticket-dialog';
import {
  SupportTicketDetailsDialog,
  SupportTicketStatusBadge,
} from '@/features/account/components/support/support-ticket-display';
import {
  demoSupportTickets,
  formatSupportTicketDate,
  supportTicketStatusFilters,
  type NewSupportTicket,
  type SupportTicket,
  type SupportTicketStatusFilter,
} from '@/features/account/components/support/support-ticket-data';
import type { AccountRole } from '@/features/auth/api/auth';

interface SupportTicketsPanelProps {
  audience: AccountRole;
}

export function SupportTicketsPanel({ audience }: SupportTicketsPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SupportTicketStatusFilter>('all');
  const [tickets, setTickets] = useState<SupportTicket[]>(demoSupportTickets);
  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return tickets.filter((ticket) => {
      const subject = ticket.translated ? t(ticket.subject) : ticket.subject;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        ticket.id.toLocaleLowerCase().includes(normalizedQuery) ||
        subject.toLocaleLowerCase().includes(normalizedQuery);
      const matchesStatus = status === 'all' || ticket.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [query, status, t, tickets]);

  function createTicket(input: NewSupportTicket) {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      ...input,
      createdAt: now,
      id: `SUP-${Date.now().toString().slice(-10)}`,
      status: 'open',
      translated: false,
      updatedAt: now,
    };

    setTickets((current) => [ticket, ...current]);
    setQuery('');
    setStatus('all');
    toast.success(t('pages.account.sections.support.feedback.created'));
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
              aria-label={t('pages.account.sections.support.searchPlaceholder')}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('pages.account.sections.support.searchPlaceholder')}
              value={query}
            />
          </div>
          <Select
            onValueChange={(value) => setStatus(value as SupportTicketStatusFilter)}
            value={status}
          >
            <SelectTrigger
              aria-label={t('pages.account.sections.support.statusFilter')}
              className="w-full md:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportTicketStatusFilters.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`pages.account.sections.support.statuses.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {audience !== 'admin' ? <CreateSupportTicketDialog onCreate={createTicket} /> : null}
        </div>
      </Card>

      {visibleTickets.length > 0 ? (
        <>
          <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
            <Table>
              <TableCaption className="sr-only">
                {t(`pages.account.sections.support.audiences.${audience}.tableCaption`)}
              </TableCaption>
              <TableHeader className="bg-secondary/55">
                <TableRow className="hover:bg-secondary/55">
                  <TableHead className="h-12 min-w-44 px-4">
                    {t('pages.account.sections.support.columns.id')}
                  </TableHead>
                  <TableHead className="min-w-64">
                    {t('pages.account.sections.support.columns.subject')}
                  </TableHead>
                  <TableHead className="min-w-28">
                    {t('pages.account.sections.support.columns.category')}
                  </TableHead>
                  <TableHead className="min-w-28">
                    {t('pages.account.sections.support.columns.status')}
                  </TableHead>
                  <TableHead className="min-w-44">
                    {t('pages.account.sections.support.columns.updatedAt')}
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    {t('pages.account.sections.support.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTickets.map((ticket) => (
                  <SupportTicketTableRow key={ticket.id} ticket={ticket} />
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 md:hidden">
            {visibleTickets.map((ticket) => (
              <SupportTicketMobileCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </>
      ) : (
        <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
          <strong className="mt-4 text-sm">
            {t('pages.account.sections.support.empty.title')}
          </strong>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.support.empty.description')}
          </p>
        </Card>
      )}

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.support.demoNotice')}
      </p>
    </div>
  );
}

function SupportTicketTableRow({ ticket }: { ticket: SupportTicket }) {
  const { i18n, t } = useTranslation();
  const subject = ticket.translated ? t(ticket.subject) : ticket.subject;

  return (
    <TableRow className="h-16">
      <TableCell className="px-4 font-mono text-xs font-semibold">{ticket.id}</TableCell>
      <TableCell className="font-medium">{subject}</TableCell>
      <TableCell>
        <Badge variant="secondary">
          {t(`pages.account.sections.support.categories.${ticket.category}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <SupportTicketStatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatSupportTicketDate(i18n.resolvedLanguage, ticket.updatedAt)}
      </TableCell>
      <TableCell className="text-center">
        <SupportTicketDetailsDialog ticket={ticket} />
      </TableCell>
    </TableRow>
  );
}

function SupportTicketMobileCard({ ticket }: { ticket: SupportTicket }) {
  const { i18n, t } = useTranslation();
  const subject = ticket.translated ? t(ticket.subject) : ticket.subject;

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="font-mono text-xs text-muted-foreground">{ticket.id}</code>
          <strong className="mt-1 block break-words text-sm">{subject}</strong>
        </div>
        <SupportTicketDetailsDialog ticket={ticket} />
      </div>
      <div className="flex flex-wrap gap-2">
        <SupportTicketStatusBadge status={ticket.status} />
        <Badge variant="secondary">
          {t(`pages.account.sections.support.categories.${ticket.category}`)}
        </Badge>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {t('pages.account.sections.support.updatedLabel', {
          time: formatSupportTicketDate(i18n.resolvedLanguage, ticket.updatedAt),
        })}
      </p>
    </Card>
  );
}
