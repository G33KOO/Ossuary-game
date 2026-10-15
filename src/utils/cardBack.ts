import type { Card } from '../types/card'
import { assetUrl } from './assetUrl'

export type CardBackKind = 'loot' | 'monster' | 'boss' | 'oath'

// Each deck keeps its own back. Add the other official illustrations here when available.
export const cardBackArt: Partial<Record<CardBackKind, string>> = {
  loot: assetUrl('images/card-backs/butin.webp'),
  oath: assetUrl('images/card-backs/serment.webp'),
}

export function cardBackKind(card: Pick<Card, 'deck'>): CardBackKind | undefined {
  if (card.deck === 'Butin') return 'loot'
  if (card.deck === 'Monstre') return 'monster'
  if (card.deck === 'Boss') return 'boss'
  if (card.deck === 'Serment') return 'oath'
  return undefined
}
