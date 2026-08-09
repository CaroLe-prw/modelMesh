import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import {
  OrderAmount,
  OrderDetailsDialog,
  OrderStatusBadge,
} from '@/features/account/components/orders/order-display';
import {
  type RechargeOrder,
  formatOrderDate,
} from '@/features/account/components/orders/order-data';

export function OrdersMobileList({ orders }: { orders: RechargeOrder[] }) {
  const { i18n, t } = useTranslation();

  return (
    <div className="grid gap-3 md:hidden">
      {orders.map((order) => (
        <Card className="gap-0 py-0 shadow-sm" key={order.id}>
          <article className="p-4">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="font-mono">#{order.id}</strong>
                <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {order.orderNumber}
                </code>
              </div>
              <OrderStatusBadge status={order.status} />
            </header>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/45 p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('pages.account.sections.orders.columns.paid')}
                </dt>
                <dd className="mt-1">
                  <OrderAmount
                    creditedAmountUsd={order.creditedAmountUsd}
                    feeRate={order.feeRate}
                    paidAmountUsd={order.paidAmountUsd}
                  />
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
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">
                  {t('pages.account.sections.orders.columns.createdAt')}
                </dt>
                <dd className="mt-1 font-mono text-xs">
                  {formatOrderDate(i18n.resolvedLanguage, order.createdAt)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-end">
              <OrderDetailsDialog order={order} />
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}
