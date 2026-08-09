import { useTranslation } from 'react-i18next';
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
  OrderAmount,
  OrderDetailsDialog,
  OrderStatusBadge,
} from '@/features/account/components/orders/order-display';
import {
  type RechargeOrder,
  formatOrderDate,
} from '@/features/account/components/orders/order-data';

export function OrdersTable({ orders }: { orders: RechargeOrder[] }) {
  const { i18n, t } = useTranslation();

  return (
    <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
      <Table>
        <TableCaption className="sr-only">
          {t('pages.account.sections.orders.tableCaption')}
        </TableCaption>
        <TableHeader className="bg-secondary/55">
          <TableRow className="hover:bg-secondary/55">
            <TableHead className="h-12 px-4">
              {t('pages.account.sections.orders.columns.id')}
            </TableHead>
            <TableHead className="min-w-48">
              {t('pages.account.sections.orders.columns.orderNumber')}
            </TableHead>
            <TableHead className="min-w-44">
              {t('pages.account.sections.orders.columns.paid')}
            </TableHead>
            <TableHead className="min-w-28">
              {t('pages.account.sections.orders.columns.paymentMethod')}
            </TableHead>
            <TableHead className="min-w-24">
              {t('pages.account.sections.orders.columns.status')}
            </TableHead>
            <TableHead className="min-w-44">
              {t('pages.account.sections.orders.columns.createdAt')}
            </TableHead>
            <TableHead className="w-20 text-right">
              {t('pages.account.sections.orders.columns.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow className="h-[72px]" key={order.id}>
              <TableCell className="px-4 font-mono font-semibold">#{order.id}</TableCell>
              <TableCell>
                <code className="font-mono text-xs">{order.orderNumber}</code>
              </TableCell>
              <TableCell>
                <OrderAmount
                  creditedAmountUsd={order.creditedAmountUsd}
                  feeRate={order.feeRate}
                  paidAmountUsd={order.paidAmountUsd}
                />
              </TableCell>
              <TableCell>
                {t(`pages.account.sections.orders.paymentMethods.${order.paymentMethod}`)}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatOrderDate(i18n.resolvedLanguage, order.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <OrderDetailsDialog order={order} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
