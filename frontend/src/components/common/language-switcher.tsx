import { ChevronDown, Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, type SupportedLanguage } from '@/i18n';

function getCurrentLanguage(language: string): SupportedLanguage {
  return language.startsWith('zh') ? 'zh-CN' : 'en';
}

export function LanguageMenuItems() {
  const { i18n, t } = useTranslation();
  const currentLanguage = getCurrentLanguage(i18n.resolvedLanguage ?? i18n.language);

  function handleLanguageChange(value: string) {
    if (value === 'zh-CN' || value === 'en') {
      void changeLanguage(value);
    }
  }

  return (
    <DropdownMenuRadioGroup onValueChange={handleLanguageChange} value={currentLanguage}>
      <DropdownMenuRadioItem value="zh-CN">{t('language.options.zhCN')}</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="en">{t('language.options.en')}</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

export function LanguageSwitcher() {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={t('language.label')} className="gap-1.5 px-2.5" variant="ghost">
          <Globe2 aria-hidden="true" />
          <span>{t('language.short')}</span>
          <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
