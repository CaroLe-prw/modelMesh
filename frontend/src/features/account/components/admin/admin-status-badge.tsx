import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { AdminCatalogReviewStatus } from '@/features/account/api/admin-catalog-reviews';
import type { AdminUserStatus } from '@/features/account/api/admin-users';
import type {
  AdminAuditOutcome,
  AdminMerchantStatus,
  AdminReconciliationStatus,
  AdminRiskStatus,
  AdminWithdrawalStatus,
} from '@/features/account/components/admin/admin-demo-data';
import type { MerchantUsageStatus } from '@/features/account/components/merchant/merchant-demo-data';

type AdminStatus =
  | AdminAuditOutcome
  | AdminMerchantStatus
  | AdminReconciliationStatus
  | AdminCatalogReviewStatus
  | AdminRiskStatus
  | AdminUserStatus
  | AdminWithdrawalStatus
  | MerchantUsageStatus;

const statusClasses: Record<AdminStatus, string> = {
  active: 'border-success/25 bg-success/10 text-success',
  approved: 'border-success/25 bg-success/10 text-success',
  disabled: 'border-border bg-secondary text-muted-foreground',
  failed: 'border-destructive/25 bg-destructive/10 text-destructive',
  investigating: 'border-warning/25 bg-warning/10 text-warning',
  matched: 'border-success/25 bg-success/10 text-success',
  mismatch: 'border-destructive/25 bg-destructive/10 text-destructive',
  open: 'border-destructive/25 bg-destructive/10 text-destructive',
  pending: 'border-warning/25 bg-warning/10 text-warning',
  rejected: 'border-destructive/25 bg-destructive/10 text-destructive',
  resolved: 'border-success/25 bg-success/10 text-success',
  succeeded: 'border-success/25 bg-success/10 text-success',
  suspended: 'border-border bg-secondary text-muted-foreground',
};

export function AdminStatusBadge({
  namespace,
  status,
}: {
  namespace:
    | 'auditLogs'
    | 'catalogReviews'
    | 'ledger'
    | 'merchants'
    | 'riskAlerts'
    | 'usageLogs'
    | 'users'
    | 'withdrawals';
  status: AdminStatus;
}) {
  const { t } = useTranslation();

  return (
    <Badge className={statusClasses[status]} variant="outline">
      {t(`pages.account.sections.admin.${namespace}.statuses.${status}`)}
    </Badge>
  );
}
