import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { newGame, reduce } from './engine'
import type { GameState } from './types'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function battle(race: GameState['race'] = 'Humain') {
  let game = newGame('Mage', race, 42)
  game.promptQueue = []
  game.monsterDeck.unshift(id('Fouisseur'))
  game = reduce(game, { t: 'fightMonster' })
  game.promptQueue = []
  game.combat!.flags = []
  game.level = 4
  game.hand = [id('Force'), id('Chance')]
  return game
}
function reroll(game: GameState) {
  game = reduce(game, { t: 'answer', option: 'mage-flee' })
  expect(game.promptQueue[0].purpose).toBe('pay')
  return reduce(game, { t: 'answer', option: game.hand[0] })
}

describe('Mage escape rerolls', () => {
  it.each(['keep-old', 'keep-new'])('pays a card and keeps %s before applying escape consequences', choice => {
    let game = reduce(battle(), { t: 'flee' })
    const old = game.combat!.fleeRoll!
    expect(game.promptQueue[0].purpose).toBe('flee-result')
    expect(game.level).toBe(4)
    expect(game.stats.flees).toBe(0)
    expect(game.stats.defeats).toBe(0)
    game = reroll(game)
    const fresh = game.combat!.fleeRoll!
    expect(game.hand).toHaveLength(1)
    expect(game.combat!.playerDie).toBeNull()
    expect(game.combat!.hasRolled).toBe(false)
    expect(game.promptQueue[0].purpose).toBe('mage-keep')
    game = reduce(game, { t: 'answer', option: choice })
    const kept = choice === 'keep-old' ? old : fresh
    expect(game.combat!.fleeRoll).toEqual(kept)
    expect(game.level).toBe(4)
    game = reduce(game, { t: 'answer', option: 'accept-flee' })
    expect(game.combat).toBeNull()
    expect(game.level).toBe(kept.total >= 4 ? 4 : 3)
    expect(game.stats.flees).toBe(kept.total >= 4 ? 1 : 0)
    expect(game.stats.defeats).toBe(kept.total >= 4 ? 0 : 1)
  })
  it('can cancel the payment and return to the pending escape result without a discard', () => {
    let game = reduce(battle(), { t: 'flee' })
    const old = game.combat!.fleeRoll
    game = reduce(game, { t: 'answer', option: 'mage-flee' })
    game = reduce(game, { t: 'answer', option: null })
    expect(game.promptQueue[0].purpose).toBe('flee-result')
    expect(game.combat!.fleeRoll).toEqual(old)
    expect(game.hand).toHaveLength(2)
  })
  it('offers repeated rerolls only while a card remains to pay', () => {
    let game = reduce(battle(), { t: 'flee' })
    for (let i = 0; i < 2; i++) game = reduce(reroll(game), { t: 'answer', option: 'keep-new' })
    expect(game.hand).toEqual([])
    expect(game.promptQueue[0].options).toEqual([{ id: 'accept-flee' }])
    expect(reduce(game, { t: 'roll' }).combat).toEqual(game.combat)
  })
  it('retains Elf and Moonleaf Dagger bonuses on the D6 escape reroll, without applying the combat-only artifact', () => {
    let game = battle('Elfe')
    game.dieSides = 8
    game.equipment.hands = [id('Dague Lunefeuille')]
    game.equipment.artifact = id('Astrolabe des Arcanes')
    game = reroll(reduce(game, { t: 'flee' }))
    expect(game.combat!.fleeRoll!.sides).toBe(6)
    expect(game.combat!.fleeRoll!.bonus).toBe(2)
    expect(game.promptQueue[0].purpose).toBe('mage-keep')
    expect(game.turnFlags).not.toContain('mage-artifact')
  })
  it.each(['empty-hand', 'blocked-active', 'automatic'])('does not insert an unusable Mage window (%s)', mode => {
    const game = battle(mode === 'automatic' ? 'Vesskar' : 'Humain')
    if (mode === 'empty-hand') game.hand = []
    if (mode === 'blocked-active') game.combat!.flags.push('noActive')
    const next = reduce(game, { t: 'flee' })
    expect(next.combat).toBeNull()
    expect(next.promptQueue.some(p => p.purpose === 'flee-result')).toBe(false)
  })
  it('also allows the Mage active acquired through Mimicry', () => {
    const game = battle()
    game.klass = 'Guerrier'
    game.mimic = 'Mage'
    expect(reduce(game, { t: 'flee' }).promptQueue[0].purpose).toBe('flee-result')
  })
})
