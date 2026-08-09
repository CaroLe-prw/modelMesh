import { UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { ReferralsPanel } from '@/features/account/components/referrals/referrals-panel';

export function AccountReferralsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.referrals.description')}
        eyebrow={t('pages.account.sections.referrals.eyebrow')}
        icon={UsersRound}
        title={t('pages.account.sections.referrals.title')}
      />
      <ReferralsPanel />
    </section>
  );
}
