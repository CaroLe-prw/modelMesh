import { LibraryBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminCatalogManagementPanel } from '@/features/account/components/admin/admin-catalog-management-panel';

export function AdminCatalogManagementSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.catalogManagement.description')}
        eyebrow={t('pages.account.sections.admin.catalogManagement.eyebrow')}
        icon={LibraryBig}
        title={t('pages.account.sections.admin.catalogManagement.title')}
      />
      <AdminCatalogManagementPanel />
    </section>
  );
}
