import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '@/components/ui/toggle';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const { t } = useTranslation();
  const label = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <Toggle
      aria-label={label}
      className="size-9 p-0 hover:bg-accent hover:text-accent-foreground"
      onPressedChange={onToggle}
      pressed={isDark}
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Toggle>
  );
}
