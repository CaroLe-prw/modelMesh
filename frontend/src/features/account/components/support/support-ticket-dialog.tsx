import { Plus } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  supportTicketCategories,
  type NewSupportTicket,
  type SupportTicketCategory,
} from '@/features/account/components/support/support-ticket-data';

interface CreateSupportTicketDialogProps {
  onCreate: (ticket: NewSupportTicket) => void;
}

export function CreateSupportTicketDialog({ onCreate }: CreateSupportTicketDialogProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<SupportTicketCategory>('technical');
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setCategory('technical');
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onCreate({
      category,
      description: String(formData.get('description') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim(),
    });
    setOpen(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          {t('pages.account.sections.support.actions.create')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
        closeLabel={t('pages.account.sections.support.dialog.close')}
      >
        <DialogHeader>
          <DialogTitle>{t('pages.account.sections.support.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.support.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" key={open ? 'open' : 'closed'} onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="support-ticket-subject">
              {t('pages.account.sections.support.dialog.subject')}
            </Label>
            <Input
              id="support-ticket-subject"
              maxLength={120}
              name="subject"
              placeholder={t('pages.account.sections.support.dialog.subjectPlaceholder')}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="support-ticket-category">
              {t('pages.account.sections.support.dialog.category')}
            </Label>
            <Select
              onValueChange={(value) => setCategory(value as SupportTicketCategory)}
              value={category}
            >
              <SelectTrigger
                aria-label={t('pages.account.sections.support.dialog.category')}
                id="support-ticket-category"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportTicketCategories.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`pages.account.sections.support.categories.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="support-ticket-description">
              {t('pages.account.sections.support.dialog.details')}
            </Label>
            <Textarea
              className="min-h-36 resize-y"
              id="support-ticket-description"
              maxLength={2000}
              name="description"
              placeholder={t('pages.account.sections.support.dialog.detailsPlaceholder')}
              required
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {t('pages.account.sections.support.dialog.detailsHint')}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t('pages.account.sections.support.dialog.cancel')}
            </Button>
            <Button type="submit">{t('pages.account.sections.support.dialog.submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
