import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantDashboard } from '@/features/account/components/merchant/merchant-dashboard';

export function MerchantDashboardSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.dashboard.description')}
        eyebrow={t('pages.account.sections.merchant.dashboard.eyebrow')}
        icon={LayoutDashboard}
        title={t('pages.account.sections.merchant.dashboard.title')}
      />
      <MerchantDashboard />
    </section>
  );
}
