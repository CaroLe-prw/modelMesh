import { GitBranch, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { RoutingPreview } from '@/features/home/components/hero-section';

const routingPoints = [
  { icon: SlidersHorizontal, textKey: 'pages.routing.points.policy' },
  { icon: ShieldCheck, textKey: 'pages.routing.points.fallback' },
  { icon: GitBranch, textKey: 'pages.routing.points.explainable' },
];

export function RoutingPage() {
  const { t } = useTranslation();

  return (
    <section className="relative z-10">
      <div className="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
      <div className="page-shell mx-auto grid min-h-[calc(100vh-188px)] gap-12 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-20">
        <div>
          <Badge className="border-primary/20 bg-primary/8 text-primary">
            {t('pages.routing.badge')}
          </Badge>
          <h1 className="mt-6 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">
            {t('pages.routing.title')}
          </h1>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            {t('pages.routing.description')}
          </p>
          <div className="mt-8 space-y-3">
            {routingPoints.map((point) => {
              const Icon = point.icon;

              return (
                <div
                  className="flex items-center gap-3 text-xs text-muted-foreground"
                  key={point.textKey}
                >
                  <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </span>
                  {t(point.textKey)}
                </div>
              );
            })}
          </div>
        </div>
        <RoutingPreview />
      </div>
    </section>
  );
}
