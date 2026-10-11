import type { Card } from '../types/card'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import { localizeCard } from '../i18n/cardTranslations'
import type { Locale } from '../i18n/LocaleProvider'
import { useLocale } from '../i18n/LocaleProvider'

type CardTileProps = {
  card: Card
  locale: Locale
  onSelect: (card: Card, element: HTMLElement) => void
}

export function CardTile({ card, locale, onSelect }: CardTileProps) {
  const { t } = useLocale()
  const localizedCard = localizeCard(card, locale)
  const illustration = getCardIllustration(card)

  return (
    <button
      aria-label={`${t('catalog.openCard')} ${localizedCard.name}, ${localizedCard.type}`}
      className={`lore-card type-${slugify(card.type)}`}
      onClick={(event) => onSelect(card, event.currentTarget)}
      type="button"
    >
      <span aria-hidden="true" className="card-art">
        {illustration ? (
          <img alt="" loading="lazy" src={illustration.src} />
        ) : (
          <span className="card-symbol">{symbolFor(card.type)}</span>
        )}
      </span>
      <span className="card-name">{localizedCard.name}</span>
      <span className="card-subtype">{localizedCard.subtype || localizedCard.deck}</span>
      <span className="card-bottomline">
        {card.value ? <span>{t('card.printedValue')} {card.value}</span> : <span>{t('catalog.readCard')}</span>}
        <span aria-hidden="true">↗</span>
      </span>
    </button>
  )
}

function symbolFor(type: string) {
  if (type === 'Arme') return '⚔'
  if (type === 'Armure') return '⬡'
  if (type === 'Action' || type === 'Artefact de classe') return '✧'
  if (type === 'Monstre') return '☠'
  if (type === 'Boss') return '♜'
  if (type === 'Serment') return '✳'
  if (type === 'Classe' || type === 'Race') return '◈'
  return '✦'
}
