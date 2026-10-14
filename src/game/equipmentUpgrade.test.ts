import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { newGame } from './engine'
import { equipmentImprovesHero } from './equipmentUpgrade'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function hero(...hand: string[]) {
  const game = newGame('Guerrier', 'Humain', 42)
  game.promptQueue = []
  game.hand = hand.map(id)
  return game
}

describe('equipment improvement highlights', () => {
  it('recognizes an empty armor slot, but not an equal or weaker replacement', () => {
    const game = hero('Gants Nervurés')
    expect(equipmentImprovesHero(game, id('Gants Nervurés'))).toBe(true)
    game.equipment.armors.Gants = id('Gants Nervurés')
    expect(equipmentImprovesHero(game, id('Gants Nervurés'))).toBe(false)
    game.equipment.armors.Gants = CARDS.find(c => c.type === 'Armure' && c.subtype === 'Gants' && Number.parseInt(c.value) > 1)!.id
    expect(equipmentImprovesHero(game, id('Gants Nervurés'))).toBe(false)
  })
  it('accounts for mastery even when both weapons have the same printed value', () => {
    const game = hero('Épée Demi-Lune')
    game.equipment.hands = ['Masse Nautile', 'Masse du Bastion'].map(id)
    expect(equipmentImprovesHero(game, id('Épée Demi-Lune'))).toBe(true)
    game.klass = 'Mage'
    expect(equipmentImprovesHero(game, id('Épée Demi-Lune'))).toBe(false)
  })
  it('considers upgrading either weapon slot', () => {
    const game = hero('Masse Mille-Clous')
    game.equipment.hands = ['Épée Demi-Lune', 'Masse Nautile'].map(id)
    expect(equipmentImprovesHero(game, id('Masse Mille-Clous'))).toBe(false)
    game.hand = [id('Épée Déchiqueteuse')]
    expect(equipmentImprovesHero(game, game.hand[0])).toBe(true)
  })
  it('compares a two-handed weapon against both replaced weapons together', () => {
    const game = hero('Brise-Fer à deux mains')
    game.equipment.hands = ['Masse Nautile', 'Masse du Bastion'].map(id)
    expect(equipmentImprovesHero(game, game.hand[0])).toBe(true)
    game.equipment.hands = ['Épée Demi-Lune', 'Épée Déchiqueteuse'].map(id)
    expect(equipmentImprovesHero(game, game.hand[0])).toBe(false)
  })
  it('uses the unlocked extra armor slot and leaves the game untouched', () => {
    const game = hero('Gants Nervurés')
    game.equipment.armors.Gants = CARDS.find(c => c.type === 'Armure' && c.subtype === 'Gants' && Number.parseInt(c.value) > 1)!.id
    game.equipment.extraArmor = { slot: 'Gants', id: null }
    const before = structuredClone(game)
    expect(equipmentImprovesHero(game, game.hand[0])).toBe(true)
    expect(game).toEqual(before)
  })
  it('only highlights an artifact when equippable and its slot is empty', () => {
    const game = hero()
    const artifact = CARDS.find(c => c.type === 'Artefact de classe' && c.requirement?.includes('Classe : Guerrier'))!.id
    game.hand = [artifact]
    expect(equipmentImprovesHero(game, artifact)).toBe(false)
    game.level = 10
    expect(equipmentImprovesHero(game, artifact)).toBe(true)
    game.equipment.artifact = artifact
    expect(equipmentImprovesHero(game, artifact)).toBe(false)
  })
})
