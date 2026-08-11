import { WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { MerchantWithdrawalsPanel } from '@/features/account/components/merchant/merchant-withdrawals-panel';

export function MerchantWithdrawalsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.merchant.withdrawals.description')}
        eyebrow={t('pages.account.sections.merchant.withdrawals.eyebrow')}
        icon={WalletCards}
        title={t('pages.account.sections.merchant.withdrawals.title')}
      />
      <MerchantWithdrawalsPanel />
    </section>
  );
}
