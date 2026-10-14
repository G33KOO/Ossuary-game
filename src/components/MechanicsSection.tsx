import { Link } from 'react-router-dom'
import { SectionLabel } from './SectionLabel'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'
import { assetUrl } from '../utils/assetUrl'

const steps = [
  {
    number: 'I',
    icon: 'classe-guerrier',
    title: 'mechanics.stepOneTitle',
    description: 'mechanics.stepOneDescription',
  },
  {
    number: 'II',
    icon: 'prise-main-une-main',
    title: 'mechanics.stepTwoTitle',
    description: 'mechanics.stepTwoDescription',
  },
  {
    number: 'III',
    icon: 'indicateur-puissance',
    title: 'mechanics.stepThreeTitle',
    description: 'mechanics.stepThreeDescription',
  },
  {
    number: 'IV',
    icon: 'monstre-demon',
    title: 'mechanics.stepFourTitle',
    description: 'mechanics.stepFourDescription',
  },
] as const

export function MechanicsSection() {
  const { t } = useLocale()

  return (
    <section className="mechanics-section" id="mecaniques">
      <div className="section-wrap">
        <div className="section-heading">
          <div>
            <SectionLabel number="02">{t('mechanics.section')}</SectionLabel>
            <h2>
              {t('mechanics.titleOne')}
              <br />
              <em>{t('mechanics.titleTwo')}</em>
            </h2>
            <p className="section-description">{t('mechanics.description')}</p>
          </div>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <img alt="" className="step-icon" height="64" src={assetUrl(`images/icons/${step.icon}.webp`)} width="64" />
              <h3>{t(step.title)}</h3>
              <p>{t(step.description)}</p>
            </article>
          ))}
        </div>
        <div className="boss-callout">
          <img alt="" className="boss-emblem" height="64" src={assetUrl('images/icons/monstre-demon.webp')} width="64" />
          <div>
            <p className="eyebrow">{t('mechanics.goalEyebrow')}</p>
            <h3>{t('mechanics.goalTitle')}</h3>
            <p className="boss-copy">{t('mechanics.goalDescription')}</p>
          </div>
        </div>
        <div className="section-cta">
          <Link className="button button-primary" to={paths.mechanics}>
            {t('mechanics.readRules')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
