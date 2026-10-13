import { Link } from 'react-router-dom'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'

export function SiteFooter() {
  const { t } = useLocale()

  return (
    <footer className="site-footer">
      <Link aria-label={t('brand.home')} className="brand" to={paths.home}>
        <span aria-hidden="true" className="brand-mark">O</span>
        <span className="brand-name">OSSUAIRE</span>
      </Link>
      <p>{t('footer.tagline')}</p>
      <span>{t('footer.version')}</span>
    </footer>
  )
}
