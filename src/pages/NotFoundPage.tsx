import { Link } from 'react-router-dom'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'

export function NotFoundPage() {
  const { t } = useLocale()

  return (
    <div className="page-wrap not-found-page">
      <header className="page-heading">
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.description')}</p>
        <Link className="button button-primary" to={paths.home}>{t('notFound.back')}</Link>
      </header>
    </div>
  )
}
