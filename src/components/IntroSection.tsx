import { Link } from 'react-router-dom'
import { SectionLabel } from './SectionLabel'
import { useLocale } from '../i18n/LocaleProvider'
import { paths } from '../routes/paths'

export function IntroSection() {
  const { t } = useLocale()

  return (
    <section className="intro-section section-wrap" id="univers">
      <SectionLabel number="01">{t('universe.section')}</SectionLabel>
      <div className="intro-content">
        <div>
          <p className="eyebrow">{t('universe.eyebrow')}</p>
          <h2>
            {t('universe.titleOne')}
            <br />
            <em>{t('universe.titleTwo')}</em>
          </h2>
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
