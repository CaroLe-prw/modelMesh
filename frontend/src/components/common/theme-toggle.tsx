import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const { t } = useTranslation();
  const label = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <Button aria-label={label} aria-pressed={isDark} size="icon" variant="ghost" onClick={onToggle}>
      {isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
