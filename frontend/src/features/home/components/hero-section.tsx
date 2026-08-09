import { ArrowRight, Check, GitBranch, Sparkles } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const routeCandidates = [
  { name: 'Northstar', meta: '96.0% · 2.75s', selected: true },
  { name: 'Vertex Relay', meta: '91.0% · 3.12s', selected: false },
  { name: 'Alloy Cloud', meta: '75.0% · 4.80s', selected: false },
];

export function HeroSection() {
  const { t } = useTranslation();
  const benefitKeys = [
    'home.hero.benefitCompatible',
    'home.hero.benefitNoLockIn',
    'home.hero.benefitLocalData',
  ];

  return (
    <section className="relative z-10 border-b border-border" id="top">
      <div className="hero-grid absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-[1212px] gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:pb-20 lg:pt-20">
        <div>
          <Badge className="border-primary/20 bg-primary/8 text-primary">
            <Sparkles aria-hidden="true" className="size-3" />
            {t('home.hero.badge')}
          </Badge>
          <h1 className="mt-6 max-w-3xl text-[clamp(42px,6vw,72px)] font-bold leading-[1.02] tracking-[-0.06em]">
            {t('home.hero.titleLine1')}
            <br />
            {t('home.hero.titleLine2')}
            <span className="text-primary">{t('home.hero.titleHighlight')}</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t('home.hero.description')}
          </p>

          <div className="hero-actions mt-8 flex flex-wrap">
            <Button asChild className="hero-cta hero-cta-primary" size="lg">
              <Link to="/models">
                {t('home.hero.explore')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild className="hero-cta hero-cta-secondary" size="lg" variant="outline">
              <a href="https://github.com/CaroLe-prw/modelMesh" target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" className="size-4" />
                {t('home.hero.openSource')}
              </a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
            {benefitKeys.map((key) => (
              <span className="inline-flex items-center gap-1.5" key={key}>
                <Check aria-hidden="true" className="size-3.5 text-success" />
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <RoutingPreview />
      </div>
    </section>
  );
}

export function RoutingPreview() {
  const { t } = useTranslation();

  return (
    <Card
      className="relative mx-auto w-full max-w-[540px] gap-0 p-3 shadow-[0_28px_80px_color-mix(in_srgb,var(--color-text)_10%,transparent)] sm:p-4"
      id="routing"
    >
      <div className="flex items-center justify-between border-b border-border px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <GitBranch aria-hidden="true" className="size-3.5" />
          </span>
          <span>
            <strong className="block text-xs">{t('home.routingPreview.title')}</strong>
            <small className="text-[10px] text-muted-foreground">request_01JZ8A2</small>
          </span>
        </div>
        <Badge className="border-success/20 bg-success/8 text-success">
          <span className="size-1.5 rounded-full bg-success" />
          {t('home.routingPreview.live')}
        </Badge>
      </div>

      <div className="grid gap-4 py-4 sm:grid-cols-[1fr_34px_1fr] sm:items-center">
        <Card className="gap-0 rounded-lg bg-secondary/55 p-4 shadow-none">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t('home.routingPreview.request')}</span>
            <span className="font-mono">08:42:16</span>
          </div>
          <strong className="mt-4 block font-mono text-sm">grok-4.5</strong>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <span className="rounded bg-card px-2 py-1.5 text-muted-foreground">
              {t('home.routingPreview.mode')} <b className="float-right text-foreground">chat</b>
            </span>
            <span className="rounded bg-card px-2 py-1.5 text-muted-foreground">
              {t('home.routingPreview.priority')}{' '}
              <b className="float-right text-foreground">cost</b>
            </span>
          </div>
        </Card>

        <div
          className="route-line hidden h-26 w-px justify-self-center sm:block"
          aria-hidden="true"
        >
          <span className="mt-11 block size-2 -translate-x-[3.5px] rounded-full bg-primary ring-4 ring-primary/10" />
        </div>

        <div className="space-y-2">
          {routeCandidates.map((candidate, index) => (
            <Card
              className={
                candidate.selected
                  ? 'flex-row items-center gap-3 rounded-lg border-primary/30 bg-primary/8 p-3 shadow-none'
                  : 'flex-row items-center gap-3 rounded-lg p-3 shadow-none'
              }
              key={candidate.name}
            >
              <span
                className={
                  candidate.selected
                    ? 'grid size-7 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground'
                    : 'grid size-7 place-items-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground'
                }
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[11px]">{candidate.name}</strong>
                <small className="font-mono text-[9px] text-muted-foreground">
                  {candidate.meta}
                </small>
              </span>
              {candidate.selected && <Check aria-hidden="true" className="size-4 text-primary" />}
            </Card>
          ))}
        </div>
      </div>

      <Card className="flex-row items-center justify-between gap-4 rounded-lg border-success/20 bg-success/8 px-4 py-3 shadow-none">
        <span className="text-[10px] text-muted-foreground">
          {t('home.routingPreview.selected')} <b className="text-foreground">Northstar</b>
        </span>
        <span className="font-mono text-[10px] font-semibold text-success">
          {t('home.routingPreview.estimatedSavings')}
        </span>
      </Card>
    </Card>
  );
}
