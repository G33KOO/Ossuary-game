import { describe, expect, it } from 'vitest'
import { CARDS, CLASS_NAMES, RACE_NAMES, card } from './data'
import { BOSS_IDS, activeStatus, canChangeEquipment, canEquip, canPlayAction, newGame, reduce } from './engine'
import { computePlayerPower, computePower, equipmentCardPower, weaponPower } from './power'
import type { GameAction, GameState } from './types'

function bot(state: GameState, rng: () => number): GameAction {
  const prompt = state.promptQueue[0]
  if (prompt) {
    const options = prompt.options
    if (prompt.optional && rng() < 0.5) return { t: 'answer', option: null }
    return { t: 'answer', option: options[Math.floor(rng() * options.length)].id }
  }
  if (state.combat) {
    const roll = rng()
    if (state.combat.playerDie === null && roll < 0.5) return { t: 'roll' }
    const playable = state.hand.find((id) => canPlayAction(state, id))
    if (playable && roll < 0.7) return { t: 'playAction', id: playable }
    if (activeStatus(state).available && roll < 0.8) return { t: 'useActive' }
    if (state.combat.kind === 'monster' && roll < 0.85) return { t: 'flee' }
    return { t: 'resolve' }
  }
  if (state.endTurnPending) return { t: 'endTurn' }
  for (const id of state.hand) {
    const type = card(id).type
    if (type === 'Armure' || type === 'Arme') {
      if (!JSON.stringify(state.equipment).includes(id)) return { t: 'equip', id }
    }
  }
  if (state.level >= 10) return { t: 'challengeBoss', bossId: BOSS_IDS[Math.floor(rng() * BOSS_IDS.length)] }
  return rng() < 0.7 ? { t: 'fightMonster' } : { t: 'drawLoot' }
}

function seededRng(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

describe('solo engine', () => {
  it('builds a solo deck without multiplayer-only actions and with a single artifact', () => {
    const state = newGame('Mage', 'Elfe', 1)
    const all = [...state.lootDeck, ...state.hand]
    expect(all.length).toBeGreaterThan(80)
    expect(all.filter((id) => card(id).type === 'Artefact de classe')).toHaveLength(1)
    expect(all.some((id) => ['Pillage', 'Larcin'].includes(card(id).name))).toBe(false)
    expect(state.hand).toHaveLength(5)
    expect(state.monsterDeck.every((id) => Number.parseInt(card(id).value, 10) < 15)).toBe(true)
    expect(state.strongMonsters).toHaveLength(18)
  })

  it('never throws and keeps card conservation across random full games', () => {
    const outcomes = new Set<string>()
    for (let seed = 1; seed <= 24; seed += 1) {
      const rng = seededRng(seed)
      let state = newGame(CLASS_NAMES[seed % 6], RACE_NAMES[Math.floor(seed / 6) % 6], seed)
      for (let step = 0; step < 1500 && state.phase !== 'won' && state.phase !== 'lost'; step += 1) {
        state = reduce(state, bot(state, rng))
        const total =
          state.hand.length +
          state.lootDeck.length +
          state.lootDiscard.length +
          state.equipment.hands.length +
          Object.values(state.equipment.armors).filter(Boolean).length +
          (state.equipment.artifact ? 1 : 0) +
          (state.equipment.extraArmor?.id ? 1 : 0) +
          (state.combat?.bossHand.length ?? 0) +
          (state.combat?.bossEquip.length ?? 0) +
          state.promptQueue.reduce((sum, p) => sum + (p.purpose === 'thief-pick' || p.purpose === 'tavern' || p.purpose === 'tavern-give' ? (p.ctx.choices as string[]).length : 0), 0)
        const monsters =
          state.monsterDeck.length +
          state.monsterDiscard.length +
          (state.removedMonsters?.length ?? 0) +
          state.strongMonsters.length * (state.strongAdded ? 0 : 1) +
          (state.combat?.monsters.length ?? 0) +
          (state.retainedMonsters?.length ?? 0) +
          state.promptQueue.reduce((sum, p) => sum + (Array.isArray(p.ctx.choices) && p.purpose !== 'thief-pick' && p.purpose !== 'tavern' && p.purpose !== 'tavern-give' && p.purpose !== 'oath' ? p.ctx.choices.length : 0), 0)
        expect(monsters).toBe(66)
        expect(total).toBeLessThanOrEqual(CARDS.length)
        expect(state.level).toBeGreaterThanOrEqual(1)
        expect(state.level).toBeLessThanOrEqual(10)
      }
      outcomes.add(state.phase)
    }
    expect(outcomes.size).toBeGreaterThan(0)
  }, 120000)

  it('computes combat power with mastery and the Orc bonus', () => {
    let state = newGame('Guerrier', 'Orc', 5)
    expect(state.promptQueue[0]?.purpose).toBe('oath')
    state = reduce(state, { t: 'answer', option: state.promptQueue[0].options[0].id })
    expect(state.oaths).toHaveLength(1)
    const weapon = CARDS.find((entry) => entry.type === 'Arme' && (entry.requirement ?? '').includes('Maîtrise Guerrier'))!
    state.hand.push(weapon.id)
    state = reduce(state, { t: 'equip', id: weapon.id })
    state.monsterDeck.unshift(CARDS.find(entry => entry.name === 'Tranchebec')!.id)
    state = reduce(state, { t: 'fightMonster' })
    const power = computePower(state)
    const printed = Number.parseInt(weapon.value, 10)
    expect(power?.player.equipment).toBe(printed * 2 + 1)
  })

  it('refuses boss challenge below level 10', () => {
    const state = newGame('Mage', 'Humain', 3)
    const next = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    expect(next.combat).toBeNull()
  })

  it('reports all reasons preventing class abilities and clears them when requirements are met', () => {
    const warrior = newGame('Guerrier', 'Humain', 3)
    warrior.promptQueue = []
    warrior.hand = []
    expect(activeStatus(warrior).reasons.map((reason) => reason.code)).toEqual(['combat-only', 'weapon-cost'])
    let mage = newGame('Mage', 'Humain', 3)
    mage.promptQueue = []
    mage.level = 10
    mage = reduce(mage, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    mage.promptQueue = []
    mage.hand = []
    expect(activeStatus(mage).reasons).toContainEqual({ code: 'roll-first' })
    expect(activeStatus(mage).reasons).toContainEqual({ code: 'cards-cost', required: 1, current: 0 })
    mage.combat!.flags.push('noActive')
    mage.combat!.used.push('Mage')
    expect(activeStatus(mage).reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(['monster-block', 'roll-first', 'cards-cost']))
    mage.combat!.flags = []
    mage.combat!.used = []
    mage.combat!.playerDie = 3
    mage.hand = [CARDS.find((entry) => entry.type === 'Action')!.id]
    expect(activeStatus(mage)).toEqual({ klass: 'Mage', available: true, reasons: [] })
  })

  it('explains the Rogue cost including the Artifact discount', () => {
    const state = newGame('Voleur', 'Humain', 2)
    state.promptQueue = []
    state.hand = [CARDS.find((entry) => entry.type === 'Action')!.id]
    expect(activeStatus(state).reasons).toContainEqual({ code: 'cards-cost', required: 2, current: 1 })
    state.equipment.artifact = CARDS.find((entry) => entry.type === 'Artefact de classe' && (entry.requirement ?? '').includes('Classe : Voleur'))!.id
    expect(activeStatus(state).available).toBe(true)
    state.turnFlags.push('thief')
    expect(activeStatus(state).reasons).toContainEqual({ code: 'used-turn' })
  })

  it('shows boosted equipment values for mastery, Orc weapons and doubled armor', () => {
    const state = newGame('Guerrier', 'Orc', 5)
    state.promptQueue = []
    const weapon = CARDS.find((entry) => entry.type === 'Arme' && (entry.requirement ?? '').includes('Maîtrise Guerrier'))!
    const armor = CARDS.find((entry) => entry.type === 'Armure' && Number(entry.value) > 0)!
    expect(equipmentCardPower(state, weapon.id)).toBe(Number(weapon.value) * 2 + 1)
    state.race = 'Humain'
    state.klass = 'Mage'
    expect(equipmentCardPower(state, weapon.id)).toBe(Number(weapon.value))
    state.level = 10
    const next = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    next.combat!.doubledArmors = [armor.id]
    expect(equipmentCardPower(next, armor.id)).toBe(Number(armor.value) * 2)
    next.combat = null
    expect(equipmentCardPower(next, armor.id)).toBe(Number(armor.value))
  })

  it('shows player power outside combat and uses the same calculation during combat', () => {
    const state = newGame('Guerrier', 'Orc', 5)
    state.promptQueue = []
    const weapon = CARDS.find((entry) => entry.type === 'Arme' && (entry.requirement ?? '').includes('Maîtrise Guerrier'))!
    state.equipment.hands = [weapon.id]
    const equipment = weaponPower(state, weapon.id)
    expect(computePlayerPower(state)).toEqual({ level: 1, equipment, bonus: 0, die: null, total: 1 + equipment })
    state.level = 10
    const next = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    next.combat!.playerBonus = 2
    next.combat!.playerDie = 4
    expect(computePlayerPower(next)).toEqual(computePower(next)!.player)
    expect(computePlayerPower(next).total).toBe(10 + equipment + 2 + 4)
  })

  it('draws a reproducible random Boss from the existing Bosses at level 10', () => {
    const drawn = new Set<string>()
    for (let seed = 1; seed <= 48; seed += 1) {
      const state = newGame('Mage', 'Humain', seed)
      state.promptQueue = []
      expect(reduce(state, { t: 'drawBoss' }).combat).toBeNull()
      state.level = 10
      const next = reduce(state, { t: 'drawBoss' })
      expect(next.combat?.kind).toBe('boss')
      expect(BOSS_IDS).toContain(next.combat?.bossId)
      expect(reduce(state, { t: 'drawBoss' })).toEqual(next)
      expect(reduce(next, { t: 'drawBoss' }).combat?.bossId).toBe(next.combat?.bossId)
      drawn.add(next.combat!.bossId!)
    }
    expect(drawn.size).toBe(BOSS_IDS.length)
  })

  it('allows equipment changes during combat before and after dice are rolled', () => {
    let state = newGame('Mage', 'Humain', 3)
    state.promptQueue = []
    state.level = 10
    state = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    state.promptQueue = []
    const weapon = CARDS.find((entry) => entry.type === 'Arme')!
    state.hand.push(weapon.id)
    expect(canEquip(state, weapon.id)).toBe(true)
    state = reduce(state, { t: 'equip', id: weapon.id })
    expect(state.equipment.hands).toContain(weapon.id)
    expect(state.hand).not.toContain(weapon.id)
    state = reduce(state, { t: 'unequip', id: weapon.id })
    expect(state.hand).toContain(weapon.id)
    state = reduce(state, { t: 'equip', id: weapon.id })
    state = reduce(state, { t: 'roll' })
    expect(canChangeEquipment(state)).toBe(true)
    state = reduce(state, { t: 'unequip', id: weapon.id })
    expect(state.hand).toContain(weapon.id)
  })

  it('allows equipping between Boss reactions', () => {
    let state = newGame('Mage', 'Humain', 3)
    state.promptQueue = []
    state.level = 10
    state = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    state.promptQueue = []
    const armor = CARDS.find((entry) => entry.type === 'Armure')!
    state.hand.push(armor.id)
    state = reduce(state, { t: 'bossStep' })
    expect(state.combat?.playerDie).toBeNull()
    expect(canEquip(state, armor.id)).toBe(true)
    state = reduce(state, { t: 'equip', id: armor.id })
    expect(state.hand).not.toContain(armor.id)
  })

  it('returns to the same tavern offers without changing cards, then completes a different trade', () => {
    let state = newGame('Mage', 'Humain', 3)
    const choices = state.lootDeck.splice(0, 3)
    const originalHand = [...state.hand]
    const originalDiscard = [...state.lootDiscard]
    state.promptQueue = [{ purpose: 'tavern', options: choices.map((id) => ({ id, cardId: id })), optional: true, ctx: { choices } }]
    state = reduce(state, { t: 'answer', option: choices[0] })
    expect(state.promptQueue[0].purpose).toBe('tavern-give')
    expect(state.hand).toEqual(originalHand)
    expect(state.lootDiscard).toEqual(originalDiscard)
    state = reduce(state, { t: 'answer', option: 'tavern-back' })
    expect(state.promptQueue[0].purpose).toBe('tavern')
    expect(state.promptQueue[0].options.map((option) => option.id)).toEqual(choices)
    expect(state.hand).toEqual(originalHand)
    expect(state.lootDiscard).toEqual(originalDiscard)
    state = reduce(state, { t: 'answer', option: choices[1] })
    state = reduce(state, { t: 'answer', option: originalHand[0] })
    expect(state.hand).toEqual([...originalHand.slice(1), choices[1]])
    expect(state.lootDiscard).toEqual([...originalDiscard, originalHand[0], choices[0], choices[2]])
  })

  it('plays one Boss reaction per step and waits before resolving', () => {
    let state = newGame('Mage', 'Humain', 3)
    state.promptQueue = []
    state.level = 10
    state = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
    state.promptQueue = []
    const weakness = CARDS.find((entry) => entry.name === 'Faiblesse')!
    const chance = CARDS.find((entry) => entry.name === 'Chance')!
    state.combat!.bossHand = [weakness.id, chance.id]
    state.combat!.bossDie = 3
    const before = state.log.length
    state = reduce(state, { t: 'bossStep' })
    expect(state.log.slice(before).filter((entry) => entry.code === 'bossPlays')).toEqual([{ code: 'bossPlays', params: { card: weakness.id } }])
    expect(state.combat?.bossHand).toEqual([chance.id])
    expect(state.phase).toBe('combat')
    state = reduce(state, { t: 'bossStep' })
    expect(state.combat?.bossHand).toEqual([])
    expect(state.phase).toBe('combat')
    state = reduce(state, { t: 'bossStep' })
    expect(state.phase).toBe('combat')
    expect(state.combat?.bossReady).toBe(true)
    state = reduce(state, { t: 'resolve' })
    expect(['won', 'lost']).toContain(state.phase)
  })
})
