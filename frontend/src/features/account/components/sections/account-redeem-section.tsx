import { Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { RedeemPanel } from '@/features/account/components/redeem/redeem-panel';

export function AccountRedeemSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.redeem.description')}
        eyebrow={t('pages.account.sections.redeem.eyebrow')}
        icon={Gift}
        title={t('pages.account.sections.redeem.title')}
      />
      <RedeemPanel />
    </section>
  );
}
