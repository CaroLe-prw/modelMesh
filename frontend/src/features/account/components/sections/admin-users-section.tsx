import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminUsersPanel } from '@/features/account/components/admin/admin-users-panel';

export function AdminUsersSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.users.description')}
        eyebrow={t('pages.account.sections.admin.users.eyebrow')}
        icon={Users}
        title={t('pages.account.sections.admin.users.title')}
      />
      <AdminUsersPanel />
    </section>
  );
}
