import { Activity, ArrowRight, Braces, GitBranch, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Feature {
  icon: LucideIcon;
  index: string;
  titleKey: string;
  descriptionKey: string;
  footnote: string;
}

const features: Feature[] = [
  {
    icon: Activity,
    index: '01',
    titleKey: 'home.value.features.health.title',
    descriptionKey: 'home.value.features.health.description',
    footnote: 'health / latency / uptime',
  },
  {
    icon: GitBranch,
    index: '02',
    titleKey: 'home.value.features.routing.title',
    descriptionKey: 'home.value.features.routing.description',
    footnote: 'policy / fallback / weight',
  },
  {
    icon: ShieldCheck,
    index: '03',
    titleKey: 'home.value.features.security.title',
    descriptionKey: 'home.value.features.security.description',
    footnote: 'self-hosted / auditable',
  },
];

export function ValueSection() {
  const { t } = useTranslation();

  return (
    <section className="relative z-10 border-t border-border bg-secondary/35 py-20" id="features">
      <div className="mx-auto w-full max-w-[1212px] px-4">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard feature={feature} key={feature.index} />
          ))}
        </div>

        <Card
          className="mt-4 grid gap-0 overflow-hidden py-0 lg:grid-cols-[1fr_0.85fr]"
          id="open-source"
        >
          <div className="p-7 sm:p-10">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.12em] text-primary">
              <FaGithub aria-hidden="true" className="size-3.5" />
              {t('home.value.eyebrow')}
            </span>
            <h2 className="mt-5 max-w-xl text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
              {t('home.value.title')}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              {t('home.value.description')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a href="https://github.com/CaroLe-prw/modelMesh" target="_blank" rel="noreferrer">
                  <FaGithub aria-hidden="true" className="size-4" />
                  {t('home.value.repository')}
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/features">
                  {t('home.value.docs')}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0 sm:p-7">
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-none">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="flex items-center gap-2 text-[10px] font-semibold">
                  <Braces aria-hidden="true" className="size-3.5 text-primary" />
                  request.ts
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {t('home.value.compatible')}
                </span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-6 text-muted-foreground sm:p-5 sm:text-[11px]">
                <code>
                  <span className="text-primary">const</span> response ={' '}
                  <span className="text-foreground">await</span> client.chat.completions.create(
                  {'{'}
                  {'\n  '}model: <span className="text-success">'auto'</span>,{'\n  '}messages,
                  {'\n  '}route: {'{'}
                  {'\n    '}optimize: <span className="text-success">'cost'</span>,{'\n    '}
                  fallback: <span className="text-foreground">true</span>
                  {'\n  }'}
                  {'\n}'});
                </code>
              </pre>
            </Card>
          </div>
        </Card>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { t } = useTranslation();
  const Icon = feature.icon;

  return (
    <article className="h-full">
      <Card className="group h-full gap-0 p-6 transition-colors hover:border-border-strong sm:p-7">
        <div className="flex items-start justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">{feature.index}</span>
        </div>
        <h3 className="mt-8 text-lg font-bold tracking-[-0.025em]">{t(feature.titleKey)}</h3>
        <p className="mt-3 min-h-18 text-xs leading-6 text-muted-foreground">
          {t(feature.descriptionKey)}
        </p>
        <span className="mt-7 block border-t border-border pt-4 font-mono text-[9px] text-muted-foreground">
          {feature.footnote}
        </span>
      </Card>
    </article>
  );
}
