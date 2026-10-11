import { RuleBlocks } from '../components/RuleBlocks'
import { getRules } from '../content/rules'
import { useLocale } from '../i18n/LocaleProvider'

export function RulesPage() {
  const { locale, t } = useLocale()
  const rules = getRules(locale)

  return (
    <div className="page-wrap rules-page">
      <header className="page-heading">
        <p className="eyebrow"><span /> {t('rules.eyebrow')}</p>
        <h1>
          {t('rules.titleOne')} <em>{t('rules.titleTwo')}</em>
        </h1>
        <p>{t('rules.description')}</p>
        <dl className="rule-facts">
          {rules.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>
      <div className="rules-layout">
        <nav aria-label={t('rules.tocLabel')} className="rules-toc">
          <p className="eyebrow">{t('rules.toc')}</p>
          <ol>
            {rules.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>
        <div className="rules-content">
          {rules.sections.map((section) => (
            <section className="rule-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              <RuleBlocks blocks={section.blocks} />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
