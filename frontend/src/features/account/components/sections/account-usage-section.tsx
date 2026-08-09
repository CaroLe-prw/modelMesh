import { ChartNoAxesColumnIncreasing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { UsageDashboard } from '@/features/account/components/usage/usage-dashboard';

export function AccountUsageSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.usage.description')}
        eyebrow={t('pages.account.sections.usage.eyebrow')}
        icon={ChartNoAxesColumnIncreasing}
        title={t('pages.account.sections.usage.title')}
      />
      <UsageDashboard />
    </section>
  );
}
