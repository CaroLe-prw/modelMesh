import { ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantUsageLogsPanel } from '@/features/account/components/merchant/merchant-usage-logs-panel';

export function MerchantUsageLogsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.usageLogs.description')}
        eyebrow={t('pages.account.sections.merchant.usageLogs.eyebrow')}
        icon={ScrollText}
        title={t('pages.account.sections.merchant.usageLogs.title')}
      />
      <MerchantUsageLogsPanel />
    </section>
  );
}
