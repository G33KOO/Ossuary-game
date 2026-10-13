import { describe, expect, it } from 'vitest'
import { ARMOR_SLOTS, CARDS, card } from './data'
import { BOSS_IDS, newGame, reduce } from './engine'
import { OATH, SOLO_OATH_IDS } from './oaths'
import { computePlayerPower, computePower, equipmentCardPower, handLimit, playerEquipmentPower } from './power'
import type { GameState } from './types'

function encounter(oaths: string[], minimum = 15): GameState {
  const initial = newGame('Mage', 'Humain', 42)
  initial.promptQueue = []
  initial.level = 10
  const state = reduce(initial, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
  state.oaths = oaths
  state.completedOaths = []
  state.promptQueue = []
  state.equipment = { armors: { Plastron: null, Bottes: null, Gants: null, Casque: null }, hands: [], artifact: null }
  const monster = CARDS.find((entry) => entry.type === 'Monstre' && Number(entry.value) >= minimum && !['Tressefer', 'Céramid', 'Sporule'].includes(entry.name))!
  Object.assign(state.combat!, { kind: 'monster', monsters: [monster.id], bossId: null, bossHand: [], bossEquip: [], bossBonus: 0, monsterBonus: 0, flags: [], rounds: 1, playerBonus: 100, playerDie: null, bossDie: null, actionsPlayed: 0, resolvedActions: 0, hasRolled: false, used: [] })
  return state
}

describe('solo Oaths', () => {
  it('offers only Oaths that can be fulfilled in solo', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = newGame('Mage', 'Humain', seed)
      expect(state.promptQueue[0].options.every((option) => SOLO_OATH_IDS.includes(option.id))).toBe(true)
    }
  })

  it('grants the tie reward once and retains its power outside combat', () => {
    const state = encounter([OATH.destitution])
    const power = computePower(state)!
    state.combat!.playerBonus += power.opponent.total - power.player.total
    let next = reduce(state, { t: 'resolve' })
    expect(next.completedOaths).toEqual([OATH.destitution])
    expect(computePlayerPower(next).bonus).toBe(2)
    expect(next.log.filter((entry) => entry.code === 'oathCompleted')).toHaveLength(1)
    next.promptQueue = []
    next.endTurnPending = false
    next = reduce(next, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    next.promptQueue = []
    const duel = computePower(next)!
    next.combat!.playerBonus += duel.opponent.total - duel.player.total
    next = reduce(next, { t: 'resolve' })
    expect(next.completedOaths).toEqual([OATH.destitution])
    expect(next.log.filter((entry) => entry.code === 'oathCompleted')).toHaveLength(1)
  })

  it('fulfills Burden after two excess discards and permanently raises the hand limit', () => {
    let state = newGame('Mage', 'Elfe', 9)
    state.oaths = [OATH.burden]
    state.hand = CARDS.filter((entry) => entry.type === 'Action').slice(0, 7).map((entry) => entry.id)
    state.endTurnPending = true
    state.tavernDone = true
    state.promptQueue = [{ purpose: 'discard-excess', options: state.hand.map((id) => ({ id, cardId: id })), optional: false, ctx: { count: 2 } }]
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    expect(state.completedOaths).toEqual([])
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    expect(state.completedOaths).toEqual([OATH.burden])
    expect(handLimit(state)).toBe(6)
  })

  it('grants mastery of all weapons after a qualifying victory', () => {
    let state = encounter([OATH.foreignIron])
    const weapon = CARDS.find((entry) => entry.type === 'Arme' && (entry.requirement ?? '').includes('Maîtrise Guerrier'))!
    state.equipment.hands = [weapon.id]
    state = reduce(state, { t: 'resolve' })
    expect(state.completedOaths).toContain(OATH.foreignIron)
    expect(equipmentCardPower(state, weapon.id)).toBe(Number(weapon.value) * 2)
  })

  it('grants Conqueror only without rolling, Actions or class abilities', () => {
    const state = encounter([OATH.conqueror], 18)
    const fulfilled = reduce(state, { t: 'resolve' })
    expect(fulfilled.completedOaths).toContain(OATH.conqueror)
    for (const patch of [{ hasRolled: true }, { actionsPlayed: 1 }, { used: ['Mage'] }]) {
      const ineligible = structuredClone(state)
      Object.assign(ineligible.combat!, patch)
      expect(reduce(ineligible, { t: 'resolve' }).completedOaths).not.toContain(OATH.conqueror)
    }
    const withBonus = encounter([])
    withBonus.completedOaths = [OATH.conqueror]
    const withoutBonus = structuredClone(withBonus)
    withoutBonus.completedOaths = []
    expect(reduce(withBonus, { t: 'roll' }).combat!.playerDie).toBe(reduce(withoutBonus, { t: 'roll' }).combat!.playerDie! + 1)
  })

  it('lets Second Skin hold two Armor cards in the chosen slot', () => {
    let state = encounter([OATH.secondSkin])
    for (const slot of ARMOR_SLOTS) state.equipment.armors[slot] = CARDS.filter((entry) => entry.type === 'Armure' && entry.subtype === slot).sort((a, b) => Number(b.value) - Number(a.value))[0].id
    state = reduce(state, { t: 'resolve' })
    expect(state.completedOaths).toContain(OATH.secondSkin)
    expect(state.promptQueue[0].purpose).toBe('oath-armor-slot')
    state = reduce(state, { t: 'answer', option: 'Plastron' })
    state.promptQueue = []
    state.endTurnPending = false
    const extra = CARDS.find((entry) => entry.type === 'Armure' && entry.subtype === 'Plastron' && entry.id !== state.equipment.armors.Plastron)!
    state.hand.push(extra.id)
    const before = playerEquipmentPower(state, null)
    state = reduce(state, { t: 'equip', id: extra.id })
    expect(state.equipment.extraArmor?.id).toBe(extra.id)
    expect(playerEquipmentPower(state, null)).toBe(before + Number(extra.value))
    state = reduce(state, { t: 'unequip', id: extra.id })
    expect(state.equipment.extraArmor?.id).toBeNull()
    expect(state.hand).toContain(extra.id)
  })

  it('grants Misfortune on a qualifying 1 and allows one free reroll', () => {
    const state = encounter([OATH.misfortune], 9)
    state.combat!.playerDie = 1
    const fulfilled = reduce(state, { t: 'resolve' })
    expect(fulfilled.completedOaths).toContain(OATH.misfortune)
    let next = encounter([])
    next.completedOaths = [OATH.misfortune]
    next.combat!.playerDie = 1
    next = reduce(next, { t: 'oathReroll' })
    expect(next.combat!.oathRerollUsed).toBe(true)
    next.combat!.playerDie = 1
    expect(reduce(next, { t: 'oathReroll' }).combat!.playerDie).toBe(1)
  })

  it('grants the D8 and replaces the unfulfilled Oath when Awakening is received', () => {
    expect(reduce(encounter([OATH.refusedAwakening]), { t: 'resolve' }).dieSides).toBe(8)
    let state = newGame('Mage', 'Humain', 10)
    state.promptQueue = []
    state.level = 5
    state.oaths = [OATH.refusedAwakening]
    const awakening = CARDS.find((entry) => entry.name === 'Éveil')!
    state.hand.push(awakening.id)
    state = reduce(state, { t: 'playAction', id: awakening.id })
    expect(state.oaths).not.toContain(OATH.refusedAwakening)
    expect(SOLO_OATH_IDS).toContain(state.oaths[0])
    expect(state.completedOaths).toEqual([])
  })

  it('counts resolved Actions for Arcana and recovers an Action at the next Boss', () => {
    const state = encounter([OATH.exhaustedArcana])
    state.combat!.actionsPlayed = 2
    state.combat!.resolvedActions = 1
    expect(reduce(state, { t: 'resolve' }).completedOaths).not.toContain(OATH.exhaustedArcana)
    state.combat!.resolvedActions = 2
    let next = reduce(state, { t: 'resolve' })
    expect(next.completedOaths).toContain(OATH.exhaustedArcana)
    next.promptQueue = []
    next.endTurnPending = false
    next.level = 10
    const action = CARDS.find((entry) => entry.type === 'Action')!
    next.lootDiscard.push(action.id)
    next = reduce(next, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    next.promptQueue = next.promptQueue.filter((prompt) => prompt.purpose === 'oath-boss-action')
    expect(next.promptQueue[0].options.some((option) => option.id === action.id)).toBe(true)
    next = reduce(next, { t: 'answer', option: action.id })
    expect(next.hand).toContain(action.id)
    expect(next.lootDiscard).not.toContain(action.id)
    expect(next.arcanaRewardUsed).toBe(true)
    expect(card(action.id).type).toBe('Action')
  })
})
