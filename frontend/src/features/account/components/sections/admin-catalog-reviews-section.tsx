import { PackageCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { AdminCatalogReviewsPanel } from '@/features/account/components/admin/admin-catalog-reviews-panel';

export function AdminCatalogReviewsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.catalogReviews.description')}
        eyebrow={t('pages.account.sections.admin.catalogReviews.eyebrow')}
        icon={PackageCheck}
        title={t('pages.account.sections.admin.catalogReviews.title')}
      />
      <AdminCatalogReviewsPanel />
    </section>
  );
}
