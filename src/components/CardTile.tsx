import { symbolFor } from '../utils/cardSymbols'
import type { Card } from '../types/card'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import { localizeCard } from '../i18n/cardTranslations'
import type { Locale } from '../i18n/LocaleProvider'
import { useLocale } from '../hooks/useLocale'

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
      className={`lore-card printed-card type-${slugify(card.type)}`}
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
      {card.value ? <span className="card-bottomline"><span>{t('card.printedValue')} {card.value}</span></span> : null}
    </button>
  )
}
