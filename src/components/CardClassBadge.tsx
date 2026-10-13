import type { Card } from '../types/card'
import { getCardClass, getClassIcon } from '../utils/cardClass'

export function CardClassBadge({ card, className }: { card: Card; className: string }) {
  const klass = getCardClass(card)
  return klass ? <span className={className} title={klass}><img alt={klass} src={getClassIcon(klass)} /></span> : null
}
