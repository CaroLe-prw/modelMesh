import {
  AlertCircle,
  Building2,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Save,
  UserRound,
} from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createMerchantSettlementAccount,
  deleteMerchantSettlementAccount,
  getMerchantProfile,
  setDefaultMerchantSettlementAccount,
  updateMerchantProfile,
  type MerchantProfile,
  type MerchantProfileDraft,
} from '@/features/account/api/merchant-profile';
import {
  getMerchantSettlementSettings,
  type MerchantSettlementSettings,
} from '@/features/account/api/settlement-settings';
import { MerchantSettlementAccounts } from '@/features/account/components/merchant/merchant-settlement-accounts';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';

function merchantProfileErrorKey(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.code) {
    case API_ERROR_CODE.INVALID_MERCHANT_PROFILE:
      return 'pages.account.sections.merchant.profile.feedback.invalid';
    case API_ERROR_CODE.MERCHANT_SETTLEMENT_ACCOUNT_LIMIT:
      return 'pages.account.sections.merchant.profile.settlement.feedback.limit';
    case API_ERROR_CODE.MERCHANT_SETTLEMENT_ACCOUNT_NOT_FOUND:
      return 'pages.account.sections.merchant.profile.settlement.feedback.notFound';
    case API_ERROR_CODE.MERCHANT_SETTLEMENT_OPTION_DISABLED:
      return 'pages.account.sections.merchant.profile.settlement.feedback.optionDisabled';
    default:
      return fallback;
  }
}

export function MerchantProfilePanel() {
  const { t } = useTranslation();
  const { setGuest } = useAuth();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [settlementSettings, setSettlementSettings] = useState<MerchantSettlementSettings | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    void Promise.all([
      getMerchantProfile(controller.signal),
      getMerchantSettlementSettings(controller.signal),
    ])
      .then(([profileResponse, settingsResponse]) => {
        if (!active) return;
        setProfile(profileResponse);
        setSettlementSettings(settingsResponse);
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
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion, setGuest]);

  function reload() {
    setRefreshVersion((version) => version + 1);
  }

  async function saveProfile(draft: MerchantProfileDraft): Promise<void> {
    setIsMutating(true);
    try {
      const updated = await updateMerchantProfile(draft);
      setProfile(updated);
      toast.success(t('pages.account.sections.merchant.profile.feedback.saved'));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(
        t(
          merchantProfileErrorKey(
            error,
            'pages.account.sections.merchant.profile.feedback.saveError',
          ),
        ),
      );
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleBusinessSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const formData = new FormData(event.currentTarget);
    try {
      await saveProfile({
        businessName: String(formData.get('businessName') ?? ''),
        website: String(formData.get('website') ?? ''),
        industry: String(formData.get('industry') ?? ''),
        contactName: profile.contactName,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
      });
    } catch {
      // saveProfile already presents the localized API error.
    }
  }

  async function handleContactSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const formData = new FormData(event.currentTarget);
    try {
      await saveProfile({
        businessName: profile.businessName,
        website: profile.website,
        industry: profile.industry,
        contactName: String(formData.get('contactName') ?? ''),
        contactEmail: String(formData.get('contactEmail') ?? ''),
        contactPhone: String(formData.get('contactPhone') ?? ''),
      });
    } catch {
      // saveProfile already presents the localized API error.
    }
  }

  async function mutateSettlement(
    operation: () => Promise<MerchantProfile>,
    successKey: string,
    fallbackErrorKey: string,
  ): Promise<void> {
    setIsMutating(true);
    try {
      const updated = await operation();
      setProfile(updated);
      toast.success(t(successKey));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setGuest();
      toast.error(t(merchantProfileErrorKey(error, fallbackErrorKey)));
      if (
        error instanceof ApiError &&
        error.code === API_ERROR_CODE.MERCHANT_SETTLEMENT_OPTION_DISABLED
      ) {
        reload();
      }
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading && (!profile || !settlementSettings)) {
    return (
      <Card className="grid min-h-56 place-items-center gap-0 px-6 text-center shadow-sm">
        <div>
          <LoaderCircle aria-hidden="true" className="mx-auto size-5 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t('pages.account.sections.merchant.profile.feedback.loading')}
          </p>
        </div>
      </Card>
    );
  }

  if (!profile || !settlementSettings || loadError) {
    return (
      <Card className="items-center gap-0 border-dashed px-6 py-14 text-center shadow-sm">
        <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
        <strong className="mt-4 text-sm">
          {t('pages.account.sections.merchant.profile.feedback.loadError')}
        </strong>
        <Button className="mt-4" onClick={reload} type="button" variant="outline">
          <RefreshCw aria-hidden="true" />
          {t('pages.account.sections.merchant.profile.feedback.retry')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="gap-0 py-0 shadow-sm">
        <PanelHeader
          description={t('pages.account.sections.merchant.profile.business.description')}
          icon={Building2}
          title={t('pages.account.sections.merchant.profile.business.title')}
        />
        <form
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
          key={`business-${profile.updatedAt}`}
          onSubmit={handleBusinessSubmit}
        >
          <ProfileField
            defaultValue={profile.businessName}
            disabled={isMutating}
            id="merchant-business-name"
            label={t('pages.account.sections.merchant.profile.business.name')}
            maxLength={120}
            minLength={2}
            name="businessName"
            required
          />
          <ProfileField
            defaultValue={profile.merchantCode}
            id="merchant-business-id"
            label={t('pages.account.sections.merchant.profile.business.merchantId')}
            readOnly
          />
          <ProfileField
            defaultValue={profile.website}
            disabled={isMutating}
            id="merchant-business-website"
            label={t('pages.account.sections.merchant.profile.business.website')}
            maxLength={255}
            name="website"
            type="url"
          />
          <ProfileField
            defaultValue={profile.industry}
            disabled={isMutating}
            id="merchant-business-industry"
            label={t('pages.account.sections.merchant.profile.business.industry')}
            maxLength={80}
            minLength={2}
            name="industry"
            required
          />
          <div className="flex justify-end sm:col-span-2">
            <SaveButton
              disabled={isMutating}
              label={t('pages.account.sections.merchant.profile.save')}
            />
          </div>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <Card className="gap-0 py-0 shadow-sm">
          <PanelHeader
            description={t('pages.account.sections.merchant.profile.contact.description')}
            icon={UserRound}
            title={t('pages.account.sections.merchant.profile.contact.title')}
          />
          <form
            className="grid gap-5 p-5 sm:p-6"
            key={`contact-${profile.updatedAt}`}
            onSubmit={handleContactSubmit}
          >
            <ProfileField
              defaultValue={profile.contactName}
              disabled={isMutating}
              id="merchant-contact-name"
              label={t('pages.account.sections.merchant.profile.contact.name')}
              maxLength={80}
              minLength={2}
              name="contactName"
              required
            />
            <ProfileField
              defaultValue={profile.contactEmail}
              disabled={isMutating}
              id="merchant-contact-email"
              label={t('pages.account.sections.merchant.profile.contact.email')}
              maxLength={254}
              name="contactEmail"
              required
              type="email"
            />
            <ProfileField
              defaultValue={profile.contactPhone}
              disabled={isMutating}
              id="merchant-contact-phone"
              label={t('pages.account.sections.merchant.profile.contact.phone')}
              maxLength={32}
              name="contactPhone"
              type="tel"
            />
            <SaveButton
              disabled={isMutating}
              label={t('pages.account.sections.merchant.profile.save')}
            />
          </form>
        </Card>

        <Card className="gap-0 py-0 shadow-sm">
          <PanelHeader
            description={t('pages.account.sections.merchant.profile.settlement.description')}
            icon={CreditCard}
            title={t('pages.account.sections.merchant.profile.settlement.title')}
          />
          <MerchantSettlementAccounts
            accounts={profile.settlementAccounts}
            disabled={isMutating}
            settings={settlementSettings}
            onCreate={(draft) =>
              mutateSettlement(
                () => createMerchantSettlementAccount(draft),
                'pages.account.sections.merchant.profile.settlement.feedback.added',
                'pages.account.sections.merchant.profile.settlement.feedback.addError',
              )
            }
            onDelete={(id) =>
              mutateSettlement(
                () => deleteMerchantSettlementAccount(id),
                'pages.account.sections.merchant.profile.settlement.feedback.deleted',
                'pages.account.sections.merchant.profile.settlement.feedback.deleteError',
              )
            }
            onSetDefault={(id) =>
              mutateSettlement(
                () => setDefaultMerchantSettlementAccount(id),
                'pages.account.sections.merchant.profile.settlement.feedback.defaultUpdated',
                'pages.account.sections.merchant.profile.settlement.feedback.defaultError',
              )
            }
          />
        </Card>
      </div>
    </div>
  );
}

function SaveButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <Button className="w-full sm:w-auto sm:justify-self-end" disabled={disabled} type="submit">
      {disabled ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : (
        <Save aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

function PanelHeader({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof Building2;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ProfileField({
  defaultValue,
  disabled = false,
  id,
  label,
  maxLength,
  minLength,
  name,
  readOnly = false,
  required = false,
  type = 'text',
}: {
  defaultValue: string;
  disabled?: boolean;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name?: string;
  readOnly?: boolean;
  required?: boolean;
  type?: 'email' | 'tel' | 'text' | 'url';
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        className={readOnly ? 'bg-secondary/45 text-muted-foreground' : undefined}
        defaultValue={defaultValue}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        readOnly={readOnly}
        required={required}
        type={type}
      />
    </div>
  );
}
