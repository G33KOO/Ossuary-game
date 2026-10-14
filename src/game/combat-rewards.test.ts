import { describe, expect, it } from 'vitest'
import { CARDS, RACE_NAMES, printedPower } from './data'
import { newGame, reduce } from './engine'
import { combatRewards } from './combatRewards'
import { computePower, monsterRaceBonus } from './power'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function battle(name: string) {
  let game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []
  game.oaths = []
  game.monsterDeck = [id(name)]
  game = reduce(game, { t: 'fightMonster' })
  game.promptQueue = []
  game.combat!.playerBonus = 100
  return game
}

describe('combat indicators share the reward and racial rules', () => {
  it.each(RACE_NAMES)('includes the visible racial bonus in monster power against %s', race => {
    const monster = CARDS.find(card => card.type === 'Monstre' && card.opponentBonus.includes(`${race}s`))!
    const game = battle(monster.name)
    game.race = race
    expect(monsterRaceBonus(game, monster.id)).toBe(1)
    expect(computePower(game)!.opponent.equipment).toBe(printedPower(monster.id) + 1)
    game.race = RACE_NAMES.find(other => other !== race)!
    expect(monsterRaceBonus(game, monster.id)).toBe(0)
  })

  it.each(['Tranchebec', 'Immaculée', 'Féticheur', 'Sporule'])('matches the actual victory rewards for %s', name => {
    const game = battle(name)
    game.combat!.lootMultiplier = 2
    game.combat!.playerDie = 6
    game.combat!.forgoLoot = name === 'Féticheur'
    const expected = combatRewards(game.combat!)
    const won = reduce(game, { t: 'resolve' })
    const victory = won.log.findLast(entry => entry.code === 'victory')!
    expect(victory.params?.loot).toBe(expected.loot)
    expect(victory.params?.levels).toBe(expected.levels)
    if (name === 'Immaculée') expect(expected.multiplier).toBe(4)
    if (name === 'Féticheur' || name === 'Sporule') expect(expected.loot).toBe(0)
  })

  it('multiplies the additional tie loot of Cisailleur too', () => {
    const game = battle('Cisailleur')
    game.combat!.lootMultiplier = 2
    const power = computePower(game)!
    game.combat!.playerBonus += power.opponent.total - power.player.total
    const expected = combatRewards(game.combat!, true)
    expect(expected.tieLoot).toBe(1)
    const won = reduce(game, { t: 'resolve' })
    expect(won.log.findLast(entry => entry.code === 'victory')?.params?.loot).toBe(expected.loot)
  })
})
