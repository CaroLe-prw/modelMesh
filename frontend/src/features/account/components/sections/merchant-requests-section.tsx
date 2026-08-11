import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantRequestsPanel } from '@/features/account/components/merchant/merchant-requests-panel';

export function MerchantRequestsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.requests.description')}
        eyebrow={t('pages.account.sections.merchant.requests.eyebrow')}
        icon={ClipboardList}
        title={t('pages.account.sections.merchant.requests.title')}
      />
      <MerchantRequestsPanel />
    </section>
  );
}
