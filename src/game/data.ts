import cardsData from '../data/cards.json'
import type { Card } from '../types/card'

export const CARDS = cardsData as Card[]
export const CARD_BY_ID = new Map(CARDS.map((entry) => [entry.id, entry]))

export function card(id: string): Card {
  const found = CARD_BY_ID.get(id)
  if (!found) {
    throw new Error(`Unknown card id: ${id}`)
  }
  return found
}

export function printedPower(id: string) {
  return Number.parseInt(card(id).value, 10) || 0
}

export const CLASS_NAMES = ['Guerrier', 'Druide', 'Chasseur', 'Mage', 'Voleur', 'Nécromancien'] as const
export const RACE_NAMES = ['Nain', 'Humain', 'Elfe', 'Orc', 'Revenant', 'Vesskar'] as const
export const ARMOR_SLOTS = ['Plastron', 'Bottes', 'Gants', 'Casque'] as const

export type ClassName = (typeof CLASS_NAMES)[number]
export type RaceName = (typeof RACE_NAMES)[number]

// Multiplayer-only Actions are removed from the solo Butin deck.
export const SOLO_EXCLUDED_ACTIONS = new Set([
  'Pillage',
  'Usurpation',
  'Permutation',
  'Interversion',
  'Paralysie',
  'Priorité',
  'Exclusion',
  'Achat forcé',
  'Incapacité',
  'Contre-sort',
  'Réquisition',
  'Troc aveugle',
  'Larcin',
  'Prise de gage',
])

export const COMBAT_ONLY_ACTIONS = new Set([
  'Peur',
  'Chance',
  'Malchance',
  'Faiblesse',
  'Force',
  'Dépossession',
  'Brise-armure',
  'Frénésie',
  'Apaiser',
  'Cupidité',
  'Corrosion',
  'Destruction',
  'Exécution',
  'Invocation',
])
