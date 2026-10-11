import { PageHeading } from '../components/PageHeading'
import { SoloSimulator } from '../components/SoloSimulator'
import { soloCopy } from '../content/solo'
import { useLocale } from '../i18n/LocaleProvider'

export function SoloPage() {
  const { t, locale } = useLocale()
  const copy = soloCopy[locale]

  return (
    <div className="page-wrap solo-page">
      <PageHeading
        artKey="le-martyr"
        description={t('solo.description')}
        eyebrow={t('solo.eyebrow')}
        title={
          <>
            {t('solo.titleOne')} <em>{t('solo.titleTwo')}</em>
          </>
        }
      />

      <section className="solo-simulator" id="simulateur">
        <h2>{copy.sim.title}</h2>
        <SoloSimulator />
      </section>

      <section className="solo-rules">
        <h2>{copy.rulesTitle}</h2>
        <p>{copy.rulesIntro}</p>
        <div className="solo-rules-grid">
          {copy.rules.map((section) => (
            <article className="solo-rule" key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
