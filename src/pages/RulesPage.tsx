import { PageHeading } from '../components/PageHeading'
import { RuleBlocks } from '../components/RuleBlocks'
import { getRules } from '../content/rules'
import { useLocale } from '../hooks/useLocale'

export function RulesPage() {
  const { locale, t } = useLocale()
  const rules = getRules(locale)

  return (
    <div className="page-wrap rules-page">
      <PageHeading
        artKey="vitrail"
        description={t('rules.description')}
        eyebrow={t('rules.eyebrow')}
        title={
          <>
            {t('rules.titleOne')} <em>{t('rules.titleTwo')}</em>
          </>
        }
      >
        <dl className="rule-facts">
          {rules.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </PageHeading>
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
