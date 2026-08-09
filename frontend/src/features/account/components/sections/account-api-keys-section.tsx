import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { ApiKeysPanel } from '@/features/account/components/api-keys/api-keys-panel';

export function AccountApiKeysSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.apiKeys.description')}
        eyebrow={t('pages.account.sections.apiKeys.eyebrow')}
        icon={KeyRound}
        title={t('pages.account.sections.apiKeys.title')}
      />
      <ApiKeysPanel />
    </section>
  );
}
