import { Brand } from '@/components/common/brand';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 border-t border-border">
      <div className="page-shell mx-auto flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Brand compact />
          <span className="text-xs text-muted-foreground">{t('footer.tagline')}</span>
        </div>
        <div className="flex gap-5 text-xs text-muted-foreground">
          <Link className="hover:text-foreground" to="/models">
            {t('footer.models')}
          </Link>
          <Link className="hover:text-foreground" to="/features">
            {t('footer.docs')}
          </Link>
          <a
            className="hover:text-foreground"
            href="https://github.com/CaroLe-prw/modelMesh"
            target="_blank"
            rel="noreferrer"
          >
            {t('footer.license')}
          </a>
        </div>
      </div>
    </footer>
  );
}
