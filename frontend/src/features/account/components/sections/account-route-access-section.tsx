import { Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { RouteAccessPanel } from '@/features/account/components/route-access/route-access-panel';

export function AccountRouteAccessSection() {
  const { t } = useTranslation();

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.routeAccess.description')}
        eyebrow={t('pages.account.sections.routeAccess.eyebrow')}
        icon={Route}
        title={t('pages.account.sections.routeAccess.title')}
      />
      <RouteAccessPanel />
    </section>
  );
}
