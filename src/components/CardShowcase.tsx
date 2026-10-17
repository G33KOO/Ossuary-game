import { Link } from 'react-router-dom'
import cardsData from '../data/cards.json'
import { useCardDialog } from '../hooks/useCardDialog'
import { localizeCard } from '../i18n/cardTranslations'
import { useLocale } from '../hooks/useLocale'
import type { MessageKey } from '../i18n/messages'
import { paths } from '../routes/paths'
import type { Card } from '../types/card'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'

const cards = cardsData as Card[]

type CardShowcaseProps = {
  cardType: 'Classe' | 'Boss'
  eyebrow: MessageKey
  title: MessageKey
  description: MessageKey
}

export function CardShowcase({ cardType, eyebrow, title, description }: CardShowcaseProps) {
  const { locale, t } = useLocale()
  const { openCard } = useCardDialog()
  const showcased = cards.filter((card) => card.type === cardType)

  return (
    <section className={`showcase-section showcase-${slugify(cardType)}`}>
      <div className="section-wrap">
        <div className="showcase-heading">
          <p className="eyebrow">{t(eyebrow)}</p>
          <h2>{t(title)}</h2>
          <p>{t(description)}</p>
        </div>
        <ul className="showcase-grid">
          {showcased.map((card) => {
            const localized = localizeCard(card, locale)
            const illustration = getCardIllustration(card)
            return (
              <li key={card.id}>
                <button
                  aria-label={`${t('catalog.openCard')} ${localized.name}`}
                  className="frame-card printed-card"
                  onClick={(event) => openCard(card, showcased, event.currentTarget)}
                  type="button"
                >
                  {illustration && <img alt="" loading="lazy" src={illustration.src} />}
                  <span className="frame-card-name">{localized.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="section-cta">
          <Link className="button button-primary" to={paths.cards}>
            {t('showcase.cta')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
