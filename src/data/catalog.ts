import cardsData from './cards.json'
import references from './referenceCards.json'
import type { Card } from '../types/card'

// Reference cards belong to the catalogue, never to the playable decks.
export const referenceCatalogCards: Card[] = references.map((entry) => {
  const spirit = Number(entry.id.slice(1)) <= 6
  return {
    id: entry.id,
    name: entry.name,
    type: spirit ? 'Esprit' : 'Aide de jeu',
    deck: spirit ? 'Esprit' : 'Aide de jeu',
    subtype: spirit ? entry.name.replace('Spectre ', '') : entry.name,
    copy: '1', value: '', requirement: '', levelGain: '', opponentBonus: '', loot: '',
    text: spirit ? 'Carte Esprit de classe. Retournez la carte pour consulter ses règles.' : 'Carte récapitulative. Consultez le recto et le verso pour retrouver les règles de jeu.',
  }
})

export const catalogCards: Card[] = [...cardsData, ...referenceCatalogCards]
