import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminMerchantsPanel } from '@/features/account/components/admin/admin-merchants-panel';

export function AdminMerchantsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.merchants.description')}
        eyebrow={t('pages.account.sections.admin.merchants.eyebrow')}
        icon={Store}
        title={t('pages.account.sections.admin.merchants.title')}
      />
      <AdminMerchantsPanel />
    </section>
  );
}
