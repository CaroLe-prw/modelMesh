import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantApplicationPanel } from '@/features/account/components/merchant-application/merchant-application-panel';

export function AccountMerchantApplicationSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchantApplication.description')}
        eyebrow={t('pages.account.sections.merchantApplication.eyebrow')}
        icon={Store}
        title={t('pages.account.sections.merchantApplication.title')}
      />
      <MerchantApplicationPanel />
    </section>
  );
}
