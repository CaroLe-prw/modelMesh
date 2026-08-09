import { RefreshCw, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  orderStatusFilters,
  type OrderStatusFilter,
} from '@/features/account/components/orders/order-data';

interface OrdersToolbarProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onStatusChange: (status: OrderStatusFilter) => void;
  status: OrderStatusFilter;
}

export function OrdersToolbar({
  isRefreshing,
  onRefresh,
  onStatusChange,
  status,
}: OrdersToolbarProps) {
  const { t } = useTranslation();

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Select
          onValueChange={(value) => onStatusChange(value as OrderStatusFilter)}
          value={status}
        >
          <SelectTrigger
            aria-label={t('pages.account.sections.orders.statusFilter')}
            className="h-10 w-full sm:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {orderStatusFilters.map((filter) => (
              <SelectItem key={filter} value={filter}>
                {t(`pages.account.sections.orders.statuses.${filter}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2 sm:flex">
          <Button
            aria-label={t('pages.account.sections.orders.actions.refresh')}
            disabled={isRefreshing}
            onClick={onRefresh}
            size="icon"
            title={t('pages.account.sections.orders.actions.refresh')}
            variant="outline"
          >
            <RefreshCw aria-hidden="true" className={isRefreshing ? 'animate-spin' : undefined} />
          </Button>
          <Button asChild>
            <Link to="/account/billing">
              <WalletCards aria-hidden="true" />
              {t('pages.account.sections.orders.actions.backToRecharge')}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
