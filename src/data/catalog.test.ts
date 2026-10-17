import { describe, expect, it } from 'vitest'
import { catalogCards, referenceCatalogCards } from './catalog'
import cardsData from './cards.json'
import { localizeCard } from '../i18n/cardTranslations'
import { buildSearchIndex, defaultFilters, matchesFilters, sortCards } from '../utils/cardFilters'
import { getCardBackIllustration, getCardIllustration } from '../utils/cardIllustration'

describe('reference cards in the catalogue', () => {
  it('includes both reference categories without modifying playable decks', () => {
    expect(catalogCards).toHaveLength(249)
    expect(cardsData).toHaveLength(240)
    expect(new Set(catalogCards.map((card) => card.id)).size).toBe(249)
    expect(referenceCatalogCards.filter((card) => card.type === 'Esprit')).toHaveLength(6)
    expect(referenceCatalogCards.filter((card) => card.type === 'Aide de jeu')).toHaveLength(3)
    for (const card of referenceCatalogCards) {
      expect(getCardIllustration(card)?.src).toContain(`${card.id}-recto.webp`)
      expect(getCardBackIllustration(card)).toContain(`${card.id}-verso.webp`)
    }
  })

  it('supports translated search, combined filters and alphabetical sorting', () => {
    const localized = catalogCards.map((card) => localizeCard(card, 'en'))
    const index = buildSearchIndex(catalogCards, localized)
    const results = index.filter((entry) => matchesFilters(entry, {
      ...defaultFilters, type: 'Esprit', subtype: 'Guerrier', query: 'warrior', valueBand: 'none',
    }))
    expect(results.map((entry) => entry.card.id)).toEqual(['A01'])
    const aids = index.filter((entry) => matchesFilters(entry, { ...defaultFilters, type: 'Aide de jeu' })).map((entry) => entry.card)
    const names = new Map(localized.map((card) => [card.id, card.name]))
    expect(sortCards(aids, 'name', names, 'en').map((card) => card.id)).toEqual(['A08', 'A09', 'A07'])
  })
})
