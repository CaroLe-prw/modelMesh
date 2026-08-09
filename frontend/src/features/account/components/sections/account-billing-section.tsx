import { CircleDollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { BillingRechargePanel } from '@/features/account/components/billing/billing-recharge-panel';

export function AccountBillingSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.billing.description')}
        eyebrow={t('pages.account.sections.billing.eyebrow')}
        icon={CircleDollarSign}
        title={t('pages.account.sections.billing.title')}
      />
      <BillingRechargePanel />
    </section>
  );
}
