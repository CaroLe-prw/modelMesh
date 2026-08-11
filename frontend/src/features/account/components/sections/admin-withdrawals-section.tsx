import { WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminWithdrawalsPanel } from '@/features/account/components/admin/admin-withdrawals-panel';

export function AdminWithdrawalsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.withdrawals.description')}
        eyebrow={t('pages.account.sections.admin.withdrawals.eyebrow')}
        icon={WalletCards}
        title={t('pages.account.sections.admin.withdrawals.title')}
      />
      <AdminWithdrawalsPanel />
    </section>
  );
}
