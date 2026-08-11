import { ClipboardList, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  merchantRequests,
  type MerchantRequest,
} from '@/features/account/components/merchant/merchant-demo-data';
import { MerchantStatusBadge } from '@/features/account/components/merchant/merchant-status-badge';

export function MerchantRequestsPanel() {
  const { t } = useTranslation();

  function showPreviewNotice() {
    toast.info(t('pages.account.sections.merchant.previewAction'));
  }

  return (
    <div className="grid min-w-0 gap-3">
      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {t('pages.account.sections.merchant.requests.panelTitle')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('pages.account.sections.merchant.requests.panelDescription')}
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={showPreviewNotice}>
            <Plus aria-hidden="true" />
            {t('pages.account.sections.merchant.requests.create')}
          </Button>
        </div>
      </Card>

      <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
        <Table>
          <TableCaption className="sr-only">
            {t('pages.account.sections.merchant.requests.caption')}
          </TableCaption>
          <TableHeader className="bg-secondary/55">
            <TableRow className="hover:bg-secondary/55">
              <TableHead className="h-12 min-w-64 px-4">
                {t('pages.account.sections.merchant.requests.columns.request')}
              </TableHead>
              <TableHead>{t('pages.account.sections.merchant.requests.columns.type')}</TableHead>
              <TableHead>{t('pages.account.sections.merchant.requests.columns.status')}</TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.requests.columns.submittedAt')}
              </TableHead>
              <TableHead className="min-w-44">
                {t('pages.account.sections.merchant.requests.columns.updatedAt')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantRequests.map((request) => (
              <RequestTableRow key={request.id} request={request} />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {merchantRequests.map((request) => (
          <RequestMobileCard key={request.id} request={request} />
        ))}
      </div>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
  );
}

function RequestTableRow({ request }: { request: MerchantRequest }) {
  const { i18n, t } = useTranslation();

  return (
    <TableRow className="h-16">
      <TableCell className="px-4">
        <strong className="block text-sm">
          {t(`pages.account.sections.merchant.requests.subjects.${request.subjectKey}`)}
        </strong>
        <span className="mt-1 block font-mono text-xs text-muted-foreground">{request.id}</span>
      </TableCell>
      <TableCell>{t(`pages.account.sections.merchant.requests.types.${request.type}`)}</TableCell>
      <TableCell>
        <MerchantStatusBadge namespace="requests" status={request.status} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, request.submittedAt)}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatMerchantDate(i18n.resolvedLanguage, request.updatedAt)}
      </TableCell>
    </TableRow>
  );
}

function RequestMobileCard({ request }: { request: MerchantRequest }) {
  const { i18n, t } = useTranslation();

  return (
    <Card className="gap-4 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ClipboardList aria-hidden="true" className="size-4" />
        </span>
        <MerchantStatusBadge namespace="requests" status={request.status} />
      </div>
      <div>
        <strong className="block text-sm">
          {t(`pages.account.sections.merchant.requests.subjects.${request.subjectKey}`)}
        </strong>
        <span className="mt-1 block font-mono text-xs text-muted-foreground">{request.id}</span>
      </div>
      <dl className="grid gap-3 rounded-lg bg-secondary/45 p-3 text-xs sm:grid-cols-2">
        <RequestMetric
          label={t('pages.account.sections.merchant.requests.columns.type')}
          value={t(`pages.account.sections.merchant.requests.types.${request.type}`)}
        />
        <RequestMetric
          label={t('pages.account.sections.merchant.requests.columns.updatedAt')}
          value={formatMerchantDate(i18n.resolvedLanguage, request.updatedAt)}
        />
      </dl>
    </Card>
  );
}

function RequestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
