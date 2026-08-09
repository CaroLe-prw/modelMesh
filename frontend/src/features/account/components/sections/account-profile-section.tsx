import { UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { ProfilePanel } from '@/features/account/components/profile/profile-panel';

export function AccountProfileSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.profile.description')}
        eyebrow={t('pages.account.sections.profile.eyebrow')}
        icon={UserRound}
        title={t('pages.account.sections.profile.title')}
      />
      <ProfilePanel />
    </section>
  );
}
