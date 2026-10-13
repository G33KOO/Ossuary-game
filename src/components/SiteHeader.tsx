import { Link, NavLink } from 'react-router-dom'
import type { Theme } from '../hooks/useTheme'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

type SiteHeaderProps = {
  theme: Theme
  onToggleTheme: () => void
}

export function SiteHeader({ theme, onToggleTheme }: SiteHeaderProps) {
  const { t } = useLocale()

  return (
    <header className="site-header">
      <Link aria-label={t('brand.home')} className="brand" to={paths.home}>
        <span className="brand-mark" aria-hidden="true">O</span>
        <span className="brand-name">OSSUAIRE</span>
      </Link>
      <nav aria-label={t('nav.label')} className="main-nav">
        <NavLink end to={paths.home}>{t('nav.home')}</NavLink>
        <NavLink to={paths.mechanics}>{t('nav.mechanics')}</NavLink>
        <NavLink to={paths.cards}>{t('nav.cards')}</NavLink>
        <NavLink to={paths.solo}>{t('nav.solo')}</NavLink>
      </nav>
      <div className="header-actions">
        <ThemeToggle onToggle={onToggleTheme} theme={theme} />
        <LanguageToggle />
      </div>
    </header>
  )
}
