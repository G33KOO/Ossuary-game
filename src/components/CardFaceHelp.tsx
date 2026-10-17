import { useId, useState } from 'react'
import type { Card } from '../types/card'
import type { Locale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'
import { getCardClass } from '../utils/cardClass'

/** Transparent hit areas explain the printed symbols without adding badges. */
export function CardFaceHelp({ card, locale }: { card: Card; locale: Locale }) {
  const id = useId()
  const [active, setActive] = useState<string | null>(null)
  const fr = locale === 'fr'
  const localized = localizeCard(card, locale)
  const klass = getCardClass(card)
  const weapon = card.type === 'Arme'
  const monster = card.type === 'Monstre' || card.type === 'Boss'
  const regions = [
    { key: 'name', label: fr ? 'Nom de la carte' : 'Card name', text: localized.name },
    ...(card.value ? [{ key: 'power', label: fr ? 'Puissance imprimée' : 'Printed power', text: fr ? `${card.value} : valeur de base utilisée pour calculer la Puissance en combat, avant les bonus et les effets.` : `${card.value}: base value used to calculate combat Power, before bonuses and effects.` }] : []),
    ...(klass ? [{ key: weapon ? 'mastery' : 'class', label: fr ? weapon ? 'Maîtrise de classe' : 'Classe' : weapon ? 'Class mastery' : 'Class', text: weapon ? fr ? `${localized.requirement || klass}. La classe indiquée double la Puissance imprimée de cette Arme.` : `${localized.requirement || klass}. The indicated class doubles this Weapon’s printed Power.` : localized.requirement || klass }] : []),
    ...(card.text ? [{ key: 'effect', label: fr ? 'Effet de la carte' : 'Card effect', text: localized.text || '' }] : []),
    ...(monster && card.levelGain ? [{ key: 'levels', label: fr ? 'Gain de niveaux' : 'Level reward', text: fr ? `${card.levelGain} niveau(x) gagné(s) en cas de victoire.` : `${card.levelGain} level(s) gained on victory.` }] : []),
    ...(monster && card.opponentBonus ? [{ key: 'opponent', label: fr ? 'Bonus contre un adversaire' : 'Opponent bonus', text: localized.opponentBonus }] : []),
    ...(monster && card.loot ? [{ key: 'loot', label: fr ? 'Butin de victoire' : 'Loot reward', text: fr ? `${card.loot} carte(s) Butin à piocher en cas de victoire.` : `${card.loot} Loot card(s) drawn on victory.` }] : []),
  ]
  return <div className={`card-face-help${monster ? ' is-monster' : ''}`}>
    {regions.map((region) => <span key={region.key} role="button" tabIndex={0}
      className={`card-help-region region-${region.key}`} aria-label={region.label}
      aria-describedby={active === region.key ? `${id}-${region.key}` : undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setActive(region.key) }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setActive(null) }}
      onFocus={() => setActive(region.key)} onBlur={() => setActive(null)}
      onClick={(event) => { event.stopPropagation(); setActive(region.key) }}
      onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); setActive(null) } if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(region.key) } }}>
      {active === region.key && <span id={`${id}-${region.key}`} role="tooltip" className="card-region-tooltip"><strong>{region.label}</strong>{region.text}</span>}
    </span>)}
  </div>
}
