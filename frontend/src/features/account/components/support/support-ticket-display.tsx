import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  SupportTicket,
  SupportTicketStatus,
} from '@/features/account/components/support/support-ticket-data';
import { formatSupportTicketDate } from '@/features/account/components/support/support-ticket-data';

const statusClasses: Record<SupportTicketStatus, string> = {
  open: 'border-primary/20 bg-primary/10 text-primary',
  inProgress: 'border-warning/25 bg-warning/10 text-warning',
  resolved: 'border-success/25 bg-success/10 text-success',
};

export function SupportTicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const { t } = useTranslation();

  return (
    <Badge className={statusClasses[status]} variant="outline">
      {t(`pages.account.sections.support.statuses.${status}`)}
    </Badge>
  );
}

export function SupportTicketDetailsDialog({ ticket }: { ticket: SupportTicket }) {
  const { i18n, t } = useTranslation();
  const subject = ticket.translated ? t(ticket.subject) : ticket.subject;
  const description = ticket.translated ? t(ticket.description) : ticket.description;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={t('pages.account.sections.support.actions.viewTicket', {
            id: ticket.id,
          })}
          size="icon-sm"
          title={t('pages.account.sections.support.actions.view')}
          variant="ghost"
        >
          <Eye aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('pages.account.sections.support.dialog.close')}>
        <DialogHeader>
          <DialogTitle>{subject}</DialogTitle>
          <DialogDescription className="font-mono">{ticket.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <SupportTicketStatusBadge status={ticket.status} />
            <Badge variant="secondary">
              {t(`pages.account.sections.support.categories.${ticket.category}`)}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7">{description}</p>
          <dl className="grid gap-3 rounded-lg border border-border bg-secondary/35 p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t('pages.account.sections.support.columns.createdAt')}
              </dt>
              <dd className="mt-1 font-mono">
                {formatSupportTicketDate(i18n.resolvedLanguage, ticket.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t('pages.account.sections.support.columns.updatedAt')}
              </dt>
              <dd className="mt-1 font-mono">
                {formatSupportTicketDate(i18n.resolvedLanguage, ticket.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
