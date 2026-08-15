import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ValueSection } from '@/features/home/components/value-section';

export function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <>
      <section className="relative z-10 border-b border-border bg-secondary/35">
        <div className="page-shell mx-auto py-14 sm:py-18">
          <Badge className="border-primary/20 bg-primary/8 text-primary">
            {t('pages.features.badge')}
          </Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
            {t('pages.features.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            {t('pages.features.description')}
          </p>
        </div>
      </section>
      <ValueSection />
    </>
  );
}
