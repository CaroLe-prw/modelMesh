import { LanguageSwitcher } from '@/components/common/language-switcher';
import { ThemeToggle } from '@/components/common/theme-toggle';

interface HeaderDisplayControlsProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function HeaderDisplayControls({ isDark, onToggleTheme }: HeaderDisplayControlsProps) {
  return (
    <div className="hidden items-center gap-0.5 sm:flex">
      <LanguageSwitcher />
      <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </div>
  );
}
