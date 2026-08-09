import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { SupportTicketsPanel } from '@/features/account/components/support/support-tickets-panel';
import type { AccountRole } from '@/features/auth/api/auth';

interface AccountSupportSectionProps {
  audience: AccountRole;
}

export function AccountSupportSection({ audience }: AccountSupportSectionProps) {
  const { t } = useTranslation();
  const audienceKey = `pages.account.sections.support.audiences.${audience}`;

  return (
    <section>
      <AccountSectionHeader
        description={t(`${audienceKey}.description`)}
        eyebrow={t(`${audienceKey}.eyebrow`)}
        icon={MessageSquareText}
        title={t(`${audienceKey}.title`)}
      />
      <SupportTicketsPanel audience={audience} />
    </section>
  );
}
