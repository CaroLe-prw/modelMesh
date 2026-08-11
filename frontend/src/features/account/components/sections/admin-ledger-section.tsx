import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminLedgerPanel } from '@/features/account/components/admin/admin-ledger-panel';

export function AdminLedgerSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.ledger.description')}
        eyebrow={t('pages.account.sections.admin.ledger.eyebrow')}
        icon={ReceiptText}
        title={t('pages.account.sections.admin.ledger.title')}
      />
      <AdminLedgerPanel />
    </section>
  );
}
