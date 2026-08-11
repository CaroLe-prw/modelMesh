import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminSettingsPanel } from '@/features/account/components/admin/admin-settings-panel';

export function AdminSettingsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.settings.description')}
        eyebrow={t('pages.account.sections.admin.settings.eyebrow')}
        icon={Settings}
        title={t('pages.account.sections.admin.settings.title')}
      />
      <AdminSettingsPanel />
    </section>
  );
}
