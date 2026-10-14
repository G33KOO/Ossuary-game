import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { activeStatus, BOSS_IDS, newGame, reduce } from './engine'
import { computePower } from './power'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function boss() {
  let game = newGame('Mage', 'Elfe', 42)
  game.level = 10
  game.promptQueue = []
  game = reduce(game, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
  game.promptQueue = []
  game.hand = [id('Force')]
  game.combat!.bossHand = []
  game.combat!.bossDie = 6
  game.combat!.bossDieModifier = -2
  game.combat!.bossReady = true
  return game
}

describe('Mage reroll targets', () => {
  it.each([false, true])('rerolls the boss with its modifiers, without the hero race/artifact bonuses (hero rolled: %s)', rolled => {
    let game = boss()
    if (rolled) game.combat!.playerDie = 4
    game.equipment.artifact = id('Astrolabe des Arcanes')
    expect(activeStatus(game).available).toBe(true)
    const hero = computePower(game)!.player.total
    game = reduce(game, { t: 'useActive' })
    game = reduce(game, { t: 'answer', option: id('Force') })
    if (rolled) {
      expect(game.promptQueue[0].purpose).toBe('mage-target')
      game = reduce(game, { t: 'answer', option: 'mage-boss' })
    }
    expect(game.combat!.bossRoll!.bonus).toBe(0)
    expect(game.combat!.bossDie).toBe(Math.max(0, game.combat!.bossRoll!.total - 2))
    expect(game.combat!.bossReady).toBe(false)
    expect(computePower(game)!.player.total).toBe(hero)
    expect(game.hand).toEqual([])
    expect(game.promptQueue).toEqual([])
    expect(game.turnFlags).not.toContain('mage-artifact')
    expect(game.log.at(-1)?.code).toBe('mageOpponentReroll')
  })
  it('rerolls an awakened boss using its D8', () => {
    let game = boss()
    game.combat!.bossSides = 8
    game = reduce(reduce(game, { t: 'useActive' }), { t: 'answer', option: id('Force') })
    expect(game.combat!.bossRoll!.sides).toBe(8)
  })
  it.each(['Tranchebec', 'Rafistolé', 'Lacéreur'])('updates the effect contribution of %s without losing other bonuses', name => {
    let game = newGame('Mage', 'Elfe', 42)
    game.promptQueue = []
    game.monsterDeck.unshift(id(name))
    game = reduce(game, { t: 'fightMonster' })
    game.promptQueue = []
    game.hand = [id('Force')]
    const effect = (value: number) => name === 'Lacéreur' ? value : name === 'Tranchebec' ? value >= 4 ? 2 : 0 : value <= 2 ? -2 : value >= 5 ? 2 : 0
    const old = game.combat!.monsterRolls![id(name)]
    game.combat!.monsterBonus += 7
    const before = game.combat!.monsterBonus
    game = reduce(reduce(game, { t: 'useActive' }), { t: 'answer', option: id('Force') })
    const fresh = game.combat!.monsterRolls![id(name)]
    expect(game.combat!.monsterBonus).toBe(before - effect(old.total) + effect(fresh.total))
    expect(fresh.bonus).toBe(name === 'Lacéreur' ? 1 : 0)
    expect(game.combat!.playerDie).toBeNull()
    expect(game.log.at(-1)?.code).toBe('mageOpponentReroll')
  })
})
