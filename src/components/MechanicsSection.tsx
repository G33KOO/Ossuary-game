import { Link } from 'react-router-dom'
import { SectionLabel } from './SectionLabel'
import { useLocale } from '../i18n/LocaleProvider'
import { paths } from '../routes/paths'

const steps = [
  {
    number: 'I',
    symbol: '⌘',
    title: 'mechanics.stepOneTitle',
    description: 'mechanics.stepOneDescription',
  },
  {
    number: 'II',
    symbol: '⌖',
    title: 'mechanics.stepTwoTitle',
    description: 'mechanics.stepTwoDescription',
  },
  {
    number: 'III',
    symbol: '⚔',
    title: 'mechanics.stepThreeTitle',
    description: 'mechanics.stepThreeDescription',
  },
  {
    number: 'IV',
    symbol: '✳',
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
          </div>
          <p>{t('mechanics.description')}</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <span aria-hidden="true" className="step-icon">{step.symbol}</span>
              <h3>{t(step.title)}</h3>
              <p>{t(step.description)}</p>
            </article>
          ))}
        </div>
        <div className="boss-callout">
          <div aria-hidden="true" className="boss-emblem">✳</div>
          <div>
            <p className="eyebrow">{t('mechanics.goalEyebrow')}</p>
            <h3>{t('mechanics.goalTitle')}</h3>
          </div>
          <p className="boss-copy">{t('mechanics.goalDescription')}</p>
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
