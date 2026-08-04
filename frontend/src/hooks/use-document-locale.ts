import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDocumentLocale() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('meta.title');

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute('content', t('meta.description'));
  }, [i18n.resolvedLanguage, t]);
}
