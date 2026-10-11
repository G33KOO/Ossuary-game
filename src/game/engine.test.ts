import { describe, expect, it } from 'vitest'
import { CARDS, CLASS_NAMES, RACE_NAMES, card } from './data'
import { BOSS_IDS, activeStatus, canPlayAction, newGame, reduce } from './engine'
import { computePower } from './power'
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
    expect(all.some((id) => ['Pillage', 'Contre-sort', 'Larcin'].includes(card(id).name))).toBe(false)
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
          (state.combat?.bossHand.length ?? 0) +
          (state.combat?.bossEquip.length ?? 0) +
          state.promptQueue.reduce((sum, p) => sum + (p.purpose === 'thief-pick' || p.purpose === 'tavern' ? (p.ctx.choices as string[]).length : 0), 0)
        const monsters =
          state.monsterDeck.length +
          state.monsterDiscard.length +
          state.strongMonsters.length * (state.strongAdded ? 0 : 1) +
          (state.combat?.monsters.length ?? 0) +
          state.promptQueue.reduce((sum, p) => sum + (Array.isArray(p.ctx.choices) && p.purpose !== 'thief-pick' && p.purpose !== 'tavern' && p.purpose !== 'oath' ? p.ctx.choices.length : 0), 0)
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
})
