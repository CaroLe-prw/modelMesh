import { HeroSection } from '@/features/home/components/hero-section';
import { StatsStrip } from '@/features/home/components/stats-strip';
import { ValueSection } from '@/features/home/components/value-section';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsStrip />
      <ValueSection />
    </>
  );
}
