import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { newGame, reduce } from './engine'
import { OATH } from './oaths'
import type { DiceRoll, GameState, LogEntry } from './types'

const id = (name: string) => CARDS.find((entry) => entry.name === name)!.id
function encounter(name = 'Tranchebec', sides: 6 | 8 = 6) {
  let game = newGame('Mage', 'Elfe', 42)
  game.promptQueue = []
  game.oaths = []
  game.dieSides = sides
  game.monsterDeck = [id(name)]
  game = reduce(game, { t: 'fightMonster' })
  return game
}
function expectElf(roll: DiceRoll, bonusPerDie = 1) {
  const natural = roll.mode === 'sum' ? roll.raw.reduce((sum, value) => sum + value, 0) : roll.mode === 'lowest' ? Math.min(...roll.raw) : roll.raw[0]
  expect(roll.bonus).toBe(bonusPerDie * (roll.mode === 'sum' ? roll.raw.length : 1))
  expect(roll.total).toBe(natural + roll.bonus)
  expect(roll.raw.every((value) => value >= 1 && value <= roll.sides)).toBe(true)
}
function fromLog(entry: LogEntry): DiceRoll {
  const p = entry.params!
  return { raw: String(p.raw).split(',').map(Number), sides: Number(p.sides), bonus: Number(p.bonus), total: Number(p.value), mode: p.mode as DiceRoll['mode'] }
}
function mageReroll(game: GameState) {
  game.hand = [id('Providence')]
  game = reduce(game, { t: 'useActive' })
  game = reduce(game, { t: 'answer', option: game.hand[0] })
  if (game.promptQueue[0]?.purpose === 'mage-target') game = reduce(game, { t: 'answer', option: 'mage-player' })
  return game
}

describe('Elfe bonus on every player die path', () => {
  for (const sides of [6, 8] as const) {
    it(`applies Elfe when Lacéreur asks the player to roll their D${sides}`, () => {
      const game = encounter('Lacéreur', sides)
      expectElf(game.combat!.monsterRolls![id('Lacéreur')])
    })
    it.each(['Tranchebec', 'Wyrm', 'Souriant'])(`applies +1 to each D${sides} combat die against %s`, (name) => {
      let game = encounter(name, sides)
      if (name !== 'Souriant') game = reduce(game, { t: 'roll' })
      expectElf(game.combat!.playerRoll!)
      expect(game.combat!.playerDie).toBe(game.combat!.playerRoll!.total)
    })
    it.each(['Cupidité', 'Exécution'])(`applies Elfe to the D${sides} roll for %s`, (name) => {
      let game = encounter('Tranchebec', sides)
      game.hand = [id(name)]
      game = reduce(game, { t: 'playAction', id: game.hand[0] })
      expectElf(fromLog(game.log.findLast((entry) => entry.code === (name === 'Cupidité' ? 'greedRoll' : 'executionRoll'))!))
    })
    it.each(['Cupidité', 'Exécution'])(`keeps Elfe on the lower of two D${sides} dice for %s against Wyrm`, (name) => {
      let game = encounter('Wyrm', sides)
      game.hand = [id(name)]
      game = reduce(game, { t: 'playAction', id: game.hand[0] })
      const roll = fromLog(game.log.findLast((entry) => entry.code === (name === 'Cupidité' ? 'greedRoll' : 'executionRoll'))!)
      expect(roll.mode).toBe('lowest')
      expect(roll.raw).toHaveLength(2)
      expectElf(roll)
    })
    it(`applies Elfe to every Sans-Visage D${sides} reward roll, including failure`, () => {
      let game = encounter('Sans-Visage', sides)
      game.combat!.playerBonus = 100
      game = reduce(game, { t: 'resolve' })
      const rolls = game.log.filter((entry) => entry.code === 'sansVisageRolled')
      expect(rolls.length).toBeGreaterThan(0)
      rolls.forEach((entry) => expectElf(fromLog(entry)))
      expect(rolls.at(-1)!.params!.extra).toBe(0)
    })
    it(`applies Elfe when rerolling D${sides} for Fielpeau`, () => {
      let game = reduce(encounter('Fielpeau', sides), { t: 'roll' })
      game = reduce(game, { t: 'answer', option: 'reroll' })
      expectElf(game.combat!.playerRoll!)
      expectElf(fromLog(game.log.findLast((entry) => entry.code === 'rerolled')!))
    })
    it(`applies Elfe to the Brasier D${sides} reroll`, () => {
      let game = reduce(encounter('Tranchebec', sides), { t: 'roll' })
      game.equipment.hands = [id('Baguette Brasier')]
      game = reduce(game, { t: 'weaponReroll', id: game.equipment.hands[0] })
      expectElf(game.combat!.playerRoll!)
      expect(game.log.at(-1)!.code).toBe('weaponRerolled')
    })
    it(`applies Elfe to the oath D${sides} reroll after a die penalty`, () => {
      let game = reduce(encounter('Tranchebec', sides), { t: 'roll' })
      game.completedOaths = [OATH.misfortune]
      game.combat!.playerDie = 1
      game = reduce(game, { t: 'oathReroll' })
      expect(game.combat!.oathRerollUsed).toBe(true)
      expectElf(game.combat!.playerRoll!)
    })
    it.each(['keep-old', 'keep-new'])(`keeps the correct D${sides} Mage roll and Elfe bonus with %s`, (choice) => {
      let game = reduce(encounter('Tranchebec', sides), { t: 'roll' })
      const original = structuredClone(game.combat!.playerRoll!)
      const originalValue = game.combat!.playerDie
      game = mageReroll(game)
      const fresh = structuredClone(game.combat!.playerRoll!)
      expect(game.promptQueue[0].ctx.old).toBe(originalValue)
      expectElf(fresh)
      game = reduce(game, { t: 'answer', option: choice })
      expect(game.combat!.playerRoll).toEqual(choice === 'keep-old' ? original : fresh)
      expect(game.combat!.playerDie).toBe(choice === 'keep-old' ? originalValue : fresh.total)
      expectElf(game.combat!.playerRoll!)
    })
    it(`adds the old roll and the new Elfe D${sides} roll once with the Mage Artifact`, () => {
      let game = reduce(encounter('Tranchebec', sides), { t: 'roll' })
      const old = game.combat!.playerDie!
      game.equipment.artifact = id('Astrolabe des Arcanes')
      game = mageReroll(game)
      expectElf(game.combat!.playerRoll!)
      expect(game.combat!.playerDie).toBe(old + game.combat!.playerRoll!.total)
      expect(game.promptQueue).toEqual([])
    })
  }
  it.each(['Tranchebec', 'Souriant', 'Wyrm'])('stacks Elfe and the permanent oath bonus when rerolling against %s', (name) => {
    let game = encounter(name)
    if (name !== 'Souriant') game = reduce(game, { t: 'roll' })
    game.completedOaths = [OATH.conqueror]
    game.equipment.hands = [id('Baguette Brasier')]
    game = reduce(game, { t: 'weaponReroll', id: game.equipment.hands[0] })
    expectElf(game.combat!.playerRoll!, 2)
  })
  it('stacks Elfe, the permanent oath bonus, and Lunefeuille on the D6 escape roll', () => {
    const game = encounter()
    game.dieSides = 8
    game.completedOaths = [OATH.conqueror]
    game.equipment.hands = [id('Dague Lunefeuille')]
    const next = reduce(game, { t: 'flee' })
    const roll = fromLog(next.log.findLast((entry) => entry.code === 'fleeRolled')!)
    expect(roll.sides).toBe(6)
    expectElf(roll, 3)
  })
  it('keeps enemy and Boss rolls free of the Elfe bonus', () => {
    const monster = encounter()
    const enemy = monster.combat!.monsterRolls![id('Tranchebec')]
    expect(enemy.bonus).toBe(0)
    expect(enemy.total).toBe(enemy.raw[0])
    let boss = newGame('Mage', 'Elfe', 42)
    boss.promptQueue = []; boss.level = 10
    boss = reduce(boss, { t: 'challengeBoss', bossId: CARDS.find((entry) => entry.type === 'Boss')!.id })
    boss.promptQueue = []
    boss = reduce(boss, { t: 'roll' })
    expectElf(boss.combat!.playerRoll!)
    expect(boss.combat!.bossRoll).toBeUndefined()
    boss.hand = []
    boss.combat!.bossHand = []
    boss = reduce(boss, { t: 'bossStep' })
    expect(boss.combat!.bossRoll!.bonus).toBe(0)
  })
})
