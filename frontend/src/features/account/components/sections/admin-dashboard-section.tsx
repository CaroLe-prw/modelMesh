import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminDashboard } from '@/features/account/components/admin/admin-dashboard';
import { AccountSectionHeader } from '@/features/account/components/account-section';

export function AdminDashboardSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.dashboard.description')}
        eyebrow={t('pages.account.sections.admin.dashboard.eyebrow')}
        icon={LayoutDashboard}
        title={t('pages.account.sections.admin.dashboard.title')}
      />
      <AdminDashboard />
    </section>
  );
}
