import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminRiskAlertsPanel } from '@/features/account/components/admin/admin-risk-alerts-panel';

export function AdminRiskAlertsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.riskAlerts.description')}
        eyebrow={t('pages.account.sections.admin.riskAlerts.eyebrow')}
        icon={ShieldAlert}
        title={t('pages.account.sections.admin.riskAlerts.title')}
      />
      <AdminRiskAlertsPanel />
    </section>
  );
}
