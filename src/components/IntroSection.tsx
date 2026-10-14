import { Link } from 'react-router-dom'
import { SectionLabel } from './SectionLabel'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'

export function IntroSection() {
  const { t } = useLocale()

  return (
    <section className="intro-section section-wrap" id="univers">
      <div className="intro-content">
        <div>
          <SectionLabel number="01">{t('universe.section')}</SectionLabel>
          <h2>
            {t('universe.titleOne')}
            <br />
            <em>{t('universe.titleTwo')}</em>
          </h2>
          <p className="intro-tagline">{t('universe.eyebrow')}</p>
        </div>
        <div className="intro-text">
          <p>{t('universe.paragraphOne')}</p>
          <p>{t('universe.paragraphTwo')}</p>
          <Link className="text-link link-light" to={paths.cards}>
            {t('universe.link')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
