import { Boxes, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminBrandsPanel } from '@/features/account/components/admin/admin-brands-panel';
import { AdminModelsPanel } from '@/features/account/components/admin/admin-models-panel';

export function AdminCatalogManagementPanel() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="brands">
      <div className="max-w-full overflow-x-auto pb-0.5">
        <TabsList className="h-auto w-max max-w-full gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="brands"
          >
            <Building2 aria-hidden="true" />
            {t('pages.account.sections.admin.catalogManagement.tabs.brands')}
          </TabsTrigger>
          <TabsTrigger
            className="h-10 min-w-36 flex-none px-4 data-[state=active]:border-primary/25 data-[state=active]:bg-primary/8 data-[state=active]:text-primary"
            value="models"
          >
            <Boxes aria-hidden="true" />
            {t('pages.account.sections.admin.catalogManagement.tabs.models')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="brands">
        <AdminBrandsPanel />
      </TabsContent>
      <TabsContent value="models">
        <AdminModelsPanel />
      </TabsContent>
    </Tabs>
  );
}
