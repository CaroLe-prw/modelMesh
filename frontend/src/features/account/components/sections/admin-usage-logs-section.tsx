import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminUsageLogsPanel } from '@/features/account/components/admin/admin-usage-logs-panel';

export function AdminUsageLogsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.usageLogs.description')}
        eyebrow={t('pages.account.sections.admin.usageLogs.eyebrow')}
        icon={Activity}
        title={t('pages.account.sections.admin.usageLogs.title')}
      />
      <AdminUsageLogsPanel />
    </section>
  );
}
