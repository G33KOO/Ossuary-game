import { describe, expect, it } from 'vitest'
import { CLASS_NAMES, RACE_NAMES } from './data'
import { newGame } from './engine'
import { SOLO_OATH_IDS } from './oaths'
import { randomHero } from './randomHero'

describe('random hero setup', () => {
  it.each([0, .2, .4, .6, .8, .99])('picks legal options from the offered oaths (%s)', value => {
    const game = randomHero(() => value)
    const offered = newGame(game.klass, game.race, Math.floor(value * 2 ** 31)).promptQueue[0].options.map(option => option.id)
    expect(CLASS_NAMES).toContain(game.klass)
    expect(RACE_NAMES).toContain(game.race)
    expect(game.oaths).toHaveLength(game.race === 'Revenant' ? 2 : 1)
    expect(new Set(game.oaths).size).toBe(game.oaths.length)
    for (const oath of game.oaths) {
      expect(offered).toContain(oath)
      expect(SOLO_OATH_IDS).toContain(oath)
    }
    expect(game.promptQueue).toEqual([])
    expect(game.phase).toBe('main')
  })
})
