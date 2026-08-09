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
import {
  type RechargeOrder,
  formatOrderCurrency,
  formatOrderDate,
} from '@/features/account/components/orders/order-data';

const statusClassNames: Record<RechargeOrder['status'], string> = {
  pending: 'border-warning/25 bg-warning/10 text-warning',
  completed: 'border-success/25 bg-success/10 text-success',
  failed: 'border-destructive/25 bg-destructive/10 text-destructive',
  refunded: 'border-primary/25 bg-primary/10 text-primary',
  cancelled: 'border-border bg-secondary text-muted-foreground',
};

export function OrderStatusBadge({ status }: Pick<RechargeOrder, 'status'>) {
  const { t } = useTranslation();

  return (
    <Badge className={statusClassNames[status]} variant="outline">
      {t(`pages.account.sections.orders.statuses.${status}`)}
    </Badge>
  );
}

export function OrderAmount({
  creditedAmountUsd,
  feeRate,
  paidAmountUsd,
}: Pick<RechargeOrder, 'creditedAmountUsd' | 'feeRate' | 'paidAmountUsd'>) {
  const { i18n, t } = useTranslation();

  return (
    <span className="grid gap-0.5">
      <span className="font-mono font-semibold tabular-nums">
        {formatOrderCurrency(i18n.resolvedLanguage, paidAmountUsd)}
        <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
          {t('pages.account.sections.orders.fee', { rate: feeRate })}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {t('pages.account.sections.orders.creditedAmount', {
          amount: formatOrderCurrency(i18n.resolvedLanguage, creditedAmountUsd),
        })}
      </span>
    </span>
  );
}

export function OrderDetailsDialog({ order }: { order: RechargeOrder }) {
  const { i18n, t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Eye aria-hidden="true" />
          {t('pages.account.sections.orders.actions.details')}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>
            {t('pages.account.sections.orders.details.title', { id: order.id })}
          </DialogTitle>
          <DialogDescription>
            {t('pages.account.sections.orders.details.description')}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-4 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.orders.columns.orderNumber')}
            </dt>
            <dd className="mt-1 truncate font-mono">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.orders.columns.status')}
            </dt>
            <dd className="mt-1">
              <OrderStatusBadge status={order.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.orders.columns.paid')}
            </dt>
            <dd className="mt-1 font-mono font-semibold">
              {formatOrderCurrency(i18n.resolvedLanguage, order.paidAmountUsd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.orders.columns.paymentMethod')}
            </dt>
            <dd className="mt-1">
              {t(`pages.account.sections.orders.paymentMethods.${order.paymentMethod}`)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">
              {t('pages.account.sections.orders.columns.createdAt')}
            </dt>
            <dd className="mt-1 font-mono">
              {formatOrderDate(i18n.resolvedLanguage, order.createdAt)}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
