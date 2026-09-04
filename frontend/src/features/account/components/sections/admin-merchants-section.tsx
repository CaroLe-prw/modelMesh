import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  ScrollText,
  Store,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AccountSectionHeader } from '@/features/account/components/account-section';
import { getAdminMerchant, type AdminMerchant } from '@/features/account/api/admin-merchants';
import type { AdminMerchantResourceView } from '@/features/account/components/admin/admin-merchant-resource-navigation';
import { AdminMerchantsPanel } from '@/features/account/components/admin/admin-merchants-panel';
import { AdminMerchantResourcesPanel } from '@/features/account/components/admin/admin-merchant-resources-panel';
import { useAuth } from '@/features/auth/context/auth-context';
import { ApiError } from '@/lib/api-client';

const resourceIcons = {
  channels: RadioTower,
  modelLogs: ScrollText,
  models: Boxes,
} satisfies Record<AdminMerchantResourceView, typeof RadioTower>;

export function AdminMerchantsSection() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const merchantId = Number(searchParams.get('merchantId'));
  const resource = adminMerchantResourceView(searchParams.get('resource'));

  if (Number.isSafeInteger(merchantId) && merchantId > 0 && resource) {
    return <AdminMerchantResourceSection merchantId={merchantId} resource={resource} />;
  }

  return (
    <section>
      <AccountSectionHeader
        description={t('pages.account.sections.admin.merchants.description')}
        eyebrow={t('pages.account.sections.admin.merchants.eyebrow')}
        icon={Store}
        title={t('pages.account.sections.admin.merchants.title')}
      />
      <AdminMerchantsPanel />
    </section>
  );
}

function AdminMerchantResourceSection({
  merchantId,
  resource,
}: {
  merchantId: number;
  resource: AdminMerchantResourceView;
}) {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const [merchant, setMerchant] = useState<AdminMerchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError(false);
    void getAdminMerchant(merchantId, controller.signal)
      .then((response) => {
        if (active) setMerchant(response);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (error instanceof ApiError && error.status === 401) {
          setGuest();
          return;
        }
        setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [merchantId, refreshVersion, setGuest]);

  return (
    <section>
      <Button asChild className="mb-5" variant="ghost">
        <Link to="/admin/merchants">
          <ArrowLeft aria-hidden="true" />
          {t('pages.account.sections.admin.merchantResources.back')}
        </Link>
      </Button>
      {loading && !merchant ? (
        <MerchantResourcePageState
          icon={LoaderCircle}
          label={t('pages.account.sections.admin.merchantResources.merchantLoading')}
          loading
        />
      ) : loadError || !merchant ? (
        <MerchantResourcePageState
          icon={AlertCircle}
          label={t('pages.account.sections.admin.merchantResources.merchantLoadError')}
          onRetry={() => setRefreshVersion((version) => version + 1)}
        />
      ) : (
        <>
          <AccountSectionHeader
            description={t(
              `pages.account.sections.admin.merchantResources.sections.${resource}.description`,
              { id: merchantId, merchant: merchant.name },
            )}
            eyebrow={t('pages.account.sections.admin.merchantResources.eyebrow')}
            icon={resourceIcons[resource]}
            title={t(`pages.account.sections.admin.merchantResources.sections.${resource}.title`, {
              id: merchantId,
              merchant: merchant.name,
            })}
          />
          <AdminMerchantResourcesPanel merchantId={merchantId} resource={resource} />
        </>
      )}
    </section>
  );
}

function MerchantResourcePageState({
  icon: Icon,
  label,
  loading = false,
  onRetry,
}: {
  icon: typeof AlertCircle;
  label: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
      <Icon
        aria-hidden="true"
        className={`size-6 ${loading ? 'animate-spin text-primary' : 'text-destructive'}`}
      />
      <strong className="mt-4 text-sm">{label}</strong>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          {t('pages.account.sections.admin.merchantResources.retry')}
        </Button>
      ) : null}
    </Card>
  );
}

function adminMerchantResourceView(value: string | null): AdminMerchantResourceView | null {
  if (value === 'channels' || value === 'models' || value === 'modelLogs') return value;
  return null;
}
