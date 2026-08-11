import { PackagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantModelsPanel } from '@/features/account/components/merchant/merchant-models-panel';

export function MerchantModelsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.models.description')}
        eyebrow={t('pages.account.sections.merchant.models.eyebrow')}
        icon={PackagePlus}
        title={t('pages.account.sections.merchant.models.title')}
      />
      <MerchantModelsPanel />
    </section>
  );
}
