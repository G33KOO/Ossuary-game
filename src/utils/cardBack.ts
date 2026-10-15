import type { Card } from '../types/card'
import { assetUrl } from './assetUrl'

export type CardBackKind = 'loot' | 'monster' | 'boss' | 'oath' | 'class'

// Each deck keeps its own back. Add the other official illustrations here when available.
export const cardBackArt: Partial<Record<CardBackKind, string>> = {
  loot: assetUrl('images/card-backs/butin.webp'),
  monster: assetUrl('images/card-backs/monstre.webp'),
  boss: assetUrl('images/card-backs/boss.webp'),
  oath: assetUrl('images/card-backs/serment.webp'),
  class: assetUrl('images/card-backs/classe.webp'),
}

export function cardBackKind(card: Pick<Card, 'deck'>): CardBackKind | undefined {
  if (card.deck === 'Butin') return 'loot'
  if (card.deck === 'Monstre') return 'monster'
  if (card.deck === 'Boss') return 'boss'
  if (card.deck === 'Serment') return 'oath'
  if (card.deck === 'Classe') return 'class'
  return undefined
}
