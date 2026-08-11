import { Building2, CreditCard, Save, UserRound } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MerchantSettlementAccounts } from '@/features/account/components/merchant/merchant-settlement-accounts';

export function MerchantProfilePanel() {
  const { t } = useTranslation();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(t('pages.account.sections.merchant.previewAction'));
  }

  return (
    <div className="grid gap-4">
      <Card className="gap-0 py-0 shadow-sm">
        <PanelHeader
          description={t('pages.account.sections.merchant.profile.business.description')}
          icon={Building2}
          title={t('pages.account.sections.merchant.profile.business.title')}
        />
        <form className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6" onSubmit={handleSubmit}>
          <ProfileField
            defaultValue="ModelMesh Labs"
            id="merchant-business-name"
            label={t('pages.account.sections.merchant.profile.business.name')}
          />
          <ProfileField
            defaultValue="MM-2026-0047"
            id="merchant-business-id"
            label={t('pages.account.sections.merchant.profile.business.merchantId')}
            readOnly
          />
          <ProfileField
            defaultValue="https://modelmesh.example"
            id="merchant-business-website"
            label={t('pages.account.sections.merchant.profile.business.website')}
            type="url"
          />
          <ProfileField
            defaultValue="AI infrastructure"
            id="merchant-business-industry"
            label={t('pages.account.sections.merchant.profile.business.industry')}
          />
          <div className="flex justify-end sm:col-span-2">
            <Button className="w-full sm:w-auto" type="submit">
              <Save aria-hidden="true" />
              {t('pages.account.sections.merchant.profile.save')}
            </Button>
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
          <form className="grid gap-5 p-5 sm:p-6" onSubmit={handleSubmit}>
            <ProfileField
              defaultValue="Carole"
              id="merchant-contact-name"
              label={t('pages.account.sections.merchant.profile.contact.name')}
            />
            <ProfileField
              defaultValue="merchant@example.com"
              id="merchant-contact-email"
              label={t('pages.account.sections.merchant.profile.contact.email')}
              type="email"
            />
            <ProfileField
              defaultValue="+86 138 0000 0000"
              id="merchant-contact-phone"
              label={t('pages.account.sections.merchant.profile.contact.phone')}
              type="tel"
            />
            <Button className="w-full sm:w-auto sm:justify-self-end" type="submit">
              <Save aria-hidden="true" />
              {t('pages.account.sections.merchant.profile.save')}
            </Button>
          </form>
        </Card>

        <Card className="gap-0 py-0 shadow-sm">
          <PanelHeader
            description={t('pages.account.sections.merchant.profile.settlement.description')}
            icon={CreditCard}
            title={t('pages.account.sections.merchant.profile.settlement.title')}
          />
          <MerchantSettlementAccounts />
        </Card>
      </div>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        {t('pages.account.sections.merchant.previewNotice')}
      </p>
    </div>
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
  id,
  label,
  readOnly = false,
  type = 'text',
}: {
  defaultValue: string;
  id: string;
  label: string;
  readOnly?: boolean;
  type?: 'email' | 'tel' | 'text' | 'url';
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        className={readOnly ? 'bg-secondary/45 text-muted-foreground' : undefined}
        defaultValue={defaultValue}
        id={id}
        readOnly={readOnly}
        type={type}
      />
    </div>
  );
}
