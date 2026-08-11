import { FileClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminAuditLogsPanel } from '@/features/account/components/admin/admin-audit-logs-panel';

export function AdminAuditLogsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.auditLogs.description')}
        eyebrow={t('pages.account.sections.admin.auditLogs.eyebrow')}
        icon={FileClock}
        title={t('pages.account.sections.admin.auditLogs.title')}
      />
      <AdminAuditLogsPanel />
    </section>
  );
}
