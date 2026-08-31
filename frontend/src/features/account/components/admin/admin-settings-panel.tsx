import { CircleDollarSign, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPriceSettingsCard } from '@/features/account/components/admin/admin-price-settings-card';
import { AdminSystemSettingsForm } from '@/features/account/components/admin/admin-system-settings-form';

export function AdminSettingsPanel() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="pricing">
      <div className="max-w-full overflow-x-auto pb-0.5">
        <TabsList className="h-auto w-max max-w-full gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="pricing"
          >
            <CircleDollarSign aria-hidden="true" />
            {t('pages.account.sections.admin.settings.tabs.pricing')}
          </TabsTrigger>
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="general"
          >
            <Settings2 aria-hidden="true" />
            {t('pages.account.sections.admin.settings.tabs.general')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pricing">
        <AdminPriceSettingsCard />
      </TabsContent>

      <TabsContent value="general">
        <AdminSystemSettingsForm />
      </TabsContent>
    </Tabs>
  );
}
