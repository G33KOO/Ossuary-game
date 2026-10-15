import { Link } from 'react-router-dom'
import { SectionLabel } from './SectionLabel'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'
import { assetUrl } from '../utils/assetUrl'

const rivalries = [
  { key: 'alliance', icon: 'classe-druide' },
  { key: 'betrayal', icon: 'classe-voleur' },
  { key: 'race', icon: 'monstre-demon' },
] as const

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
      <div className="rivalry-grid">
        {rivalries.map(({ key, icon }) => (
          <article className="step-card rivalry-card" key={key}>
            <img alt="" className="step-icon" width="56" height="56" src={assetUrl(`images/icons/${icon}.webp`)} />
            <h3>{t(`rivalry.${key}Title`)}</h3>
            <p>{t(`rivalry.${key}Description`)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
