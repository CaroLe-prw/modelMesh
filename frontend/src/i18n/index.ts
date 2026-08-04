import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { zhCN } from './locales/zh-CN';

export const LANGUAGE_STORAGE_KEY = 'modelmesh-language';
export const supportedLanguages = ['zh-CN', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

function detectLanguage(): SupportedLanguage {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (savedLanguage === 'zh-CN' || savedLanguage === 'en') {
    return savedLanguage;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: 'zh-CN',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
  initAsync: false,
});

function syncDocumentLanguage(language: string) {
  const normalizedLanguage: SupportedLanguage = language.startsWith('zh') ? 'zh-CN' : 'en';

  document.documentElement.lang = normalizedLanguage;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
}

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export function changeLanguage(language: SupportedLanguage) {
  return i18n.changeLanguage(language);
}

export default i18n;
