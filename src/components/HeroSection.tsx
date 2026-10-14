import { Link } from 'react-router-dom'
import cardsData from '../data/cards.json'
import { useCardDialog } from '../hooks/useCardDialog'
import { useLocale } from '../hooks/useLocale'
import { paths } from '../routes/paths'
import type { Card } from '../types/card'
import { getIllustrationByKey } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'

const fanKeys = ['lenvers', 'linvaincu', 'le-createur', 'le-martyr', 'le-parfait'] as const
const cards = cardsData as Card[]
const fanCards = fanKeys.flatMap((key) => {
  const card = cards.find((entry) => slugify(entry.name) === key)
  const illustration = getIllustrationByKey(key)
  return card && illustration ? [{ card, illustration }] : []
})
const backdrop = getIllustrationByKey('la-suzeraine')

export function HeroSection() {
  const { t } = useLocale()
  const { openCard } = useCardDialog()

  return (
    <section className="hero" id="accueil">
      {backdrop && <img alt="" aria-hidden="true" className="hero-backdrop" src={backdrop.src} />}
      <div className="hero-copy">
        <p className="eyebrow"><span /> {t('hero.eyebrow')}</p>
        <h1>
          {t('hero.titleOne')}
          <br />
          {t('hero.titleTwo')}
          <br />
          <em>{t('hero.titleThree')}</em>
        </h1>
        <p className="hero-description">{t('hero.description')}</p>
        <div className="hero-actions">
          <Link className="button button-primary" to={paths.cards}>
            {t('hero.explore')} <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" to={paths.mechanics}>
            {t('hero.discover')} <span aria-hidden="true">↘</span>
          </Link>
        </div>
        <div className="hero-note">
          <span className="note-rule" />
          <span>{t('hero.note')}</span>
        </div>
      </div>

      <div className="hero-art" aria-label={t('hero.artLabel')} role="group">
        <div className="hero-fan">
          {fanCards.map(({ card, illustration }) => (
            <button
              aria-label={`${t('catalog.openCard')} ${card.name}`}
              className="fan-card"
              key={card.id}
              onClick={(event) => openCard(card, fanCards.map((entry) => entry.card), event.currentTarget)}
              type="button"
            >
              <img alt="" src={illustration.src} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
