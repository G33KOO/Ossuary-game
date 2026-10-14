import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARDS, card } from './data'
import { canEquip, fleeBlocked, newGame, reduce } from './engine'
import { computePower, equipmentCardPower, handLimit } from './power'
import { loadGame, saveGame } from './save'
import type { GameState } from './types'

const id = (name: string) => CARDS.find((entry) => entry.name === name)!.id
function monster(name: string, race: GameState['race'] = 'Humain') {
  let state = newGame('Guerrier', race, 42)
  state.promptQueue = []
  state.monsterDeck.unshift(id(name))
  return reduce(state, { t: 'fightMonster' })
}
function suzeraine() {
  let state = newGame('Guerrier', 'Humain', 42)
  state.promptQueue = []; state.level = 10; state.lootDeck = []
  state = reduce(state, { t: 'challengeBoss', bossId: id('La Suzeraine') })
  return state
}
afterEach(() => vi.unstubAllGlobals())

describe('visible combat consequences', () => {
  it('adds enrage on the first completed turn after the level-up turn', () => {
    let state = monster('Tranchebec')
    state.level = 9; state.hand = []; state.lootDeck = []; state.combat!.playerBonus = 100
    state = reduce(state, { t: 'resolve' })
    expect(state.level).toBe(10)
    expect(state.turn).toBe(1)
    state = reduce(state, { t: 'endTurn' })
    expect(state.bossPressure).toBe(0)
    expect(state.bossEnrageArmed).toBe(true)
    expect(state.log.some((entry) => entry.code === 'bossGrows')).toBe(false)
    state = reduce(state, { t: 'drawLoot' })
    state = reduce(state, { t: 'endTurn' })
    expect(state.bossPressure).toBe(1)
    expect(state.log.some((entry) => entry.code === 'bossGrows')).toBe(true)
    for (const expected of [2, 3]) {
      state = reduce(state, { t: 'drawLoot' })
      state = reduce(state, { t: 'endTurn' })
      expect(state.bossPressure).toBe(expected)
    }
  })
  it('waits for all Tavern choices before arming or incrementing enrage', () => {
    let state = monster('Tranchebec')
    state.level = 9; state.combat!.playerBonus = 100; state.hand = [id('Force')]
    state = reduce(state, { t: 'resolve' })
    state = reduce(state, { t: 'endTurn' })
    expect(state.promptQueue[0].purpose).toBe('tavern')
    expect(state.bossPressure).toBe(0)
    expect(state.bossEnrageArmed).toBe(false)
    state = reduce(state, { t: 'answer', option: null })
    expect(state.bossEnrageArmed).toBe(true)
    expect(state.bossPressure).toBe(0)
    state = reduce(state, { t: 'drawLoot' })
    state = reduce(state, { t: 'endTurn' })
    expect(state.bossPressure).toBe(0)
    state = reduce(state, { t: 'answer', option: null })
    expect(state.bossPressure).toBe(1)
    state = reduce(state, { t: 'drawLoot' })
    state = reduce(state, { t: 'endTurn' })
    expect(state.bossPressure).toBe(1)
    state = reduce(state, { t: 'answer', option: null })
    expect(state.bossPressure).toBe(2)
  })
  it('keeps accumulated enrage on an older save, without granting another grace turn', () => {
    const state = newGame('Mage', 'Humain', 42)
    state.promptQueue = []; state.level = 10; state.hand = []; state.lootDeck = []
    delete state.bossEnrageArmed
    state.bossPressure = 2
    const next = reduce(reduce(state, { t: 'drawLoot' }), { t: 'endTurn' })
    expect(next.bossPressure).toBe(3)
    expect(next.bossEnrageArmed).toBe(true)
  })
  it.each(['Humain', 'Vesskar'] as const)('blocks natural escape after a combat roll for %s', (race) => {
    let state = monster('Tranchebec', race)
    expect(fleeBlocked(state)).toBe(false)
    state = reduce(state, { t: 'roll' })
    expect(fleeBlocked(state)).toBe(true)
    const next = reduce(state, { t: 'flee' })
    expect(next.combat).toEqual(state.combat)
    expect(next.seed).toBe(state.seed)
    expect(next.level).toBe(state.level)
    expect(next.log).toEqual(state.log)
  })
  it('keeps the commitment after a second assault clears the combat die', () => {
    let state = monster('Broyeur')
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'roll' })
    state = reduce(state, { t: 'resolve' })
    expect(state.combat!.playerDie).toBeNull()
    expect(fleeBlocked(state)).toBe(true)
    expect(reduce(state, { t: 'flee' }).combat).toEqual(state.combat)
  })
  it('keeps card-driven escape available after rolling', () => {
    let state = reduce(monster('Tranchebec'), { t: 'roll' })
    state.hand = [id('Peur')]
    state = reduce(state, { t: 'playAction', id: id('Peur') })
    expect(state.combat).toBeNull()
    expect(state.stats.flees).toBe(1)
  })
  it('requires an explicit Suzeraine choice before any die or resolution', () => {
    const state = suzeraine()
    expect(state.promptQueue[0].purpose).toBe('suzeraine')
    expect(reduce(state, { t: 'roll' }).combat!.playerDie).toBeNull()
    expect(reduce(state, { t: 'resolve' }).finalCombat).toBeUndefined()
    expect(reduce(state, { t: 'answer', option: 'boss-bonus' }).combat!.bossBonus).toBe(2)
  })
  it('cancels one Action after the alternative decree, while protecting Awakening', () => {
    let state = reduce(suzeraine(), { t: 'answer', option: 'cancel-action' })
    state.hand = [id('Éveil'), id('Force'), CARDS.filter((entry) => entry.name === 'Force')[1].id]
    state = reduce(state, { t: 'playAction', id: state.hand[0] })
    expect(state.dieSides).toBe(8)
    state = reduce(state, { t: 'playAction', id: state.hand[0] })
    expect(state.combat!.playerBonus).toBe(0)
    state = reduce(state, { t: 'playAction', id: state.hand[0] })
    expect(state.combat!.playerBonus).toBe(2)
    expect(state.log.filter((entry) => entry.code === 'actionCancelled')).toHaveLength(1)
  })
  it('records two separate Souriant rolls and applies Elfe to each', () => {
    const state = monster('Souriant', 'Elfe')
    const roll = state.combat!.playerRoll!
    expect(roll.raw).toHaveLength(2)
    expect(roll.bonus).toBe(2)
    expect(state.combat!.playerDie).toBe(roll.raw[0] + roll.raw[1] + 2)
    expect(state.log.at(-1)?.code).toBe('souriantRolled')
    expect(reduce(state, { t: 'roll' }).combat!.playerRoll).toEqual(roll)
    expect(computePower(state)!.player.level).toBe(0)
    expect(computePower(state)!.player.equipment).toBe(0)
  })
  it('records the Tranchebec raw die, without applying the player racial bonus to the Monster', () => {
    const state = monster('Tranchebec', 'Elfe')
    const roll = state.combat!.monsterRolls![id('Tranchebec')]
    expect(roll.bonus).toBe(0)
    expect(state.combat!.monsterBonus).toBe(roll.total >= 4 ? 2 : 0)
    expect(state.log.findLast((entry) => entry.code === 'monsterRoll')!.params!.raw).toBe(String(roll.raw[0]))
  })
  it('records every Sans-Visage roll including the final failure, before announcing Loot', () => {
    let sample: GameState | undefined
    for (let seed = 1; seed < 200; seed++) {
      let state = monster('Sans-Visage', 'Elfe')
      state.seed = seed; state.hand = []; state.combat!.playerBonus = 100
      state = reduce(state, { t: 'resolve' })
      if (state.log.filter((entry) => entry.code === 'sansVisageRolled').length > 1) { sample = state; break }
    }
    expect(sample).toBeDefined()
    const rolls = sample!.log.filter((entry) => entry.code === 'sansVisageRolled')
    expect(rolls.at(-1)!.params!.extra).toBe(0)
    expect(rolls.slice(0, -1).every((entry) => entry.params!.extra === 1)).toBe(true)
    for (const entry of rolls) expect(Number(entry.params!.value)).toBe(Number(entry.params!.raw) + 1)
    const victory = sample!.log.findLast((entry) => entry.code === 'victory')!
    expect(victory.params!.loot).toBe(Number(card(id('Sans-Visage')).loot) + rolls.length - 1)
    expect(sample!.log.indexOf(rolls.at(-1)!)).toBeLessThan(sample!.log.indexOf(victory))
  })
  it('records the flee die, failure, and actual level loss in sequence', () => {
    let state = monster('Tranchebec'); state.level = 4
    for (let seed = 1; seed < 200; seed++) {
      const next = reduce({ ...state, seed }, { t: 'flee' })
      if (!next.log.some((entry) => entry.code === 'fleeFailed')) continue
      state = next; break
    }
    const events = state.log.filter((entry) => ['fleeRolled', 'fleeFailed', 'defeat'].includes(entry.code))
    expect(events.map((entry) => entry.code)).toEqual(['fleeRolled', 'fleeFailed', 'defeat'])
    expect(events[2].params).toMatchObject({ before: 4, after: 3 })
    expect(state.level).toBe(3)
  })
  it('makes Vesskar flee without inventing a die roll or losing a level', () => {
    const next = reduce(monster('Tranchebec', 'Vesskar'), { t: 'flee' })
    expect(next.stats.flees).toBe(1)
    expect(next.log.some((entry) => entry.code === 'fleeRolled')).toBe(false)
    expect(next.log.findLast((entry) => entry.code === 'fled')!.params!.automatic).toBe(1)
  })
  it('persists the final Boss dice, played cards, equipment, and calculated verdict', () => {
    let state = reduce(suzeraine(), { t: 'answer', option: 'boss-bonus' })
    state.combat!.bossHand = [id('Chance'), id('Malchance')]
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'roll' })
    state = reduce(state, { t: 'resolve' })
    expect(state.phase).toBe('won')
    const final = state.finalCombat!
    expect(final.combat.bossPlayedCards).toEqual([id('Malchance'), id('Chance')])
    expect(final.combat.bossRoll!.raw).toHaveLength(1)
    expect(final.combat.playerRoll!.raw).toHaveLength(1)
    expect(final.power.player.total).toBeGreaterThan(final.power.opponent.total)
    const store = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) } })
    saveGame(state)
    expect(loadGame()!.finalCombat).toEqual(final)
    saveGame(null)
    expect(loadGame()).toBeNull()
  })
  it('rejects a class Artifact before level 10 and accepts it at level 10', () => {
    const state = newGame('Guerrier', 'Humain', 42); state.promptQueue = []
    const artifact = CARDS.find((entry) => entry.type === 'Artefact de classe' && entry.requirement?.includes('Guerrier'))!.id
    state.hand = [artifact]
    expect(canEquip(state, artifact)).toBe(false)
    state.level = 10
    expect(canEquip(state, artifact)).toBe(true)
    expect(reduce(state, { t: 'equip', id: artifact }).equipment.artifact).toBe(artifact)
  })
  it('equips the two-handed Fetish Axe, then lets the player choose the sacrifice after winning', () => {
    let state = monster('Tranchebec'); state.hand = [id('Hache Fétiche à deux mains')]
    state = reduce(state, { t: 'equip', id: state.hand[0] })
    expect(state.equipment.hands).toEqual([id('Hache Fétiche à deux mains')])
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'resolve' })
    expect(state.promptQueue[0].purpose).toBe('weapon-loot')
    const before = state.hand.length
    state = reduce(state, { t: 'answer', option: id('Hache Fétiche à deux mains') })
    expect(state.hand.length).toBe(before + 2)
    expect(state.equipment.hands).toEqual([])
  })
  it('applies the Humain hand limit, Orc weapon bonus, and Revenant oath choice', () => {
    expect(handLimit(newGame('Guerrier', 'Humain', 42))).toBe(6)
    expect(handLimit(newGame('Guerrier', 'Elfe', 42))).toBe(5)
    const state = monster('Tranchebec', 'Orc')
    state.equipment.hands = [id('Masse Mille-Clous')]
    const human = { ...state, race: 'Humain' as const }
    expect(equipmentCardPower(state, state.equipment.hands[0]) - equipmentCardPower(human, state.equipment.hands[0])).toBe(1)
    let revenant = newGame('Guerrier', 'Revenant', 42)
    revenant = reduce(revenant, { t: 'answer', option: revenant.promptQueue[0].options[0].id })
    expect(revenant.promptQueue[0].purpose).toBe('oath')
    revenant = reduce(revenant, { t: 'answer', option: revenant.promptQueue[0].options[0].id })
    expect(revenant.oaths).toHaveLength(2)
  })
})
