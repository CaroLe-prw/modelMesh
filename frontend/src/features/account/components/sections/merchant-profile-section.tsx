import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantProfilePanel } from '@/features/account/components/merchant/merchant-profile-panel';

export function MerchantProfileSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.profile.description')}
        eyebrow={t('pages.account.sections.merchant.profile.eyebrow')}
        icon={Building2}
        title={t('pages.account.sections.merchant.profile.title')}
      />
      <MerchantProfilePanel />
    </section>
  );
}
