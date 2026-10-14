import { card } from './data'
import { canEquip, reduce } from './engine'
import { computePlayerPower } from './power'
import type { GameState } from './types'

export function equipmentImprovesHero(state: GameState, id: string) {
  if (!canEquip(state, id)) return false
  const entry = card(id)
  if (entry.type === 'Artefact de classe') return !state.equipment.artifact
  if (entry.type === 'Armure') {
    const extra = state.equipment.extraArmor
    const current = extra?.slot === entry.subtype && state.equipment.armors[entry.subtype] ? extra.id : state.equipment.armors[entry.subtype]
    if (!current) return true
  }
  const before = computePlayerPower(state).total
  // Use the real equip rules so mastery, contextual bonuses, and replacing
  // both weapons with a two-handed weapon are accounted for together.
  const targets = entry.type === 'Arme' ? [0, 1] as const : [undefined]
  return targets.some(hand => computePlayerPower(reduce(state, { t: 'equip', id, hand })).total > before)
}
