import { RadioTower } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantChannelsPanel } from '@/features/account/components/merchant/merchant-channels-panel';

export function MerchantChannelsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.channels.description')}
        eyebrow={t('pages.account.sections.merchant.channels.eyebrow')}
        icon={RadioTower}
        title={t('pages.account.sections.merchant.channels.title')}
      />
      <MerchantChannelsPanel />
    </section>
  );
}
