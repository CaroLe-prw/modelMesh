import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { MerchantChannelStatus } from '@/features/account/api/merchant-channels';
import type {
  MerchantModelStatus,
  MerchantRequestStatus,
  MerchantUsageStatus,
  MerchantWithdrawalStatus,
} from '@/features/account/components/merchant/merchant-demo-data';

type MerchantStatus =
  | MerchantChannelStatus
  | MerchantModelStatus
  | MerchantRequestStatus
  | MerchantUsageStatus
  | MerchantWithdrawalStatus;

const statusClasses: Record<MerchantStatus, string> = {
  active: 'border-success/25 bg-success/10 text-success',
  approved: 'border-success/25 bg-success/10 text-success',
  changesRequested: 'border-warning/25 bg-warning/10 text-warning',
  degraded: 'border-warning/25 bg-warning/10 text-warning',
  draft: 'border-border bg-secondary text-muted-foreground',
  failed: 'border-destructive/25 bg-destructive/10 text-destructive',
  offline: 'border-destructive/25 bg-destructive/10 text-destructive',
  paid: 'border-success/25 bg-success/10 text-success',
  pending: 'border-warning/25 bg-warning/10 text-warning',
  processing: 'border-primary/25 bg-primary/10 text-primary',
  published: 'border-success/25 bg-success/10 text-success',
  rejected: 'border-destructive/25 bg-destructive/10 text-destructive',
  review: 'border-warning/25 bg-warning/10 text-warning',
  succeeded: 'border-success/25 bg-success/10 text-success',
};

interface MerchantStatusBadgeProps {
  namespace: 'channels' | 'models' | 'requests' | 'usageLogs' | 'withdrawals';
  status: MerchantStatus;
}

export function MerchantStatusBadge({ namespace, status }: MerchantStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge className={statusClasses[status]} variant="outline">
      {t(`pages.account.sections.merchant.${namespace}.statuses.${status}`)}
    </Badge>
  );
}
