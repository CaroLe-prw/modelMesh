import { useTranslation } from 'react-i18next';

const stats = [
  { labelKey: 'home.stats.models', value: '48+' },
  { labelKey: 'home.stats.channels', value: '126' },
  { labelKey: 'home.stats.availability', value: '99.94%' },
  { labelKey: 'home.stats.savings', value: '31%' },
];

export function StatsStrip() {
  const { t } = useTranslation();

  return (
    <section className="relative z-10 border-b border-border bg-card">
      <div className="mx-auto grid w-full max-w-[1212px] grid-cols-2 px-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            className="border-r border-border px-4 py-6 first:border-l md:px-7"
            key={stat.labelKey}
          >
            <strong className="block font-mono text-xl tracking-[-0.04em] sm:text-2xl">
              {stat.value}
            </strong>
            <span className="mt-1.5 block text-[10px] text-muted-foreground sm:text-xs">
              {t(stat.labelKey)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
