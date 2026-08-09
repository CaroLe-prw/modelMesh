import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import {
  demoRechargeOrders,
  type OrderStatusFilter,
} from '@/features/account/components/orders/order-data';
import { OrdersMobileList } from '@/features/account/components/orders/orders-mobile-list';
import { OrdersTable } from '@/features/account/components/orders/orders-table';
import { OrdersToolbar } from '@/features/account/components/orders/orders-toolbar';

export function AccountOrdersSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const visibleOrders = useMemo(
    () =>
      status === 'all'
        ? demoRechargeOrders
        : demoRechargeOrders.filter((order) => order.status === status),
    [status],
  );

  function handleRefresh() {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 500);
  }

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.orders.description')}
        eyebrow={t('pages.account.sections.orders.eyebrow')}
        icon={FileText}
        title={t('pages.account.sections.orders.title')}
      />
      <div className="grid min-w-0 gap-3">
        <OrdersToolbar
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onStatusChange={setStatus}
          status={status}
        />
        <OrdersTable orders={visibleOrders} />
        <OrdersMobileList orders={visibleOrders} />
        {visibleOrders.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <strong className="text-sm">{t('pages.account.sections.orders.empty.title')}</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('pages.account.sections.orders.empty.description')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
