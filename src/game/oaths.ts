import type { GameState } from './types'

export const OATH = {
  burden: 'OSS-CARD-230', misfortune: 'OSS-CARD-231', secondSkin: 'OSS-CARD-232',
  foreignIron: 'OSS-CARD-233', destitution: 'OSS-CARD-234', conqueror: 'OSS-CARD-235',
  refusedAwakening: 'OSS-CARD-236', exhaustedArcana: 'OSS-CARD-237',
} as const

export const SOLO_OATH_IDS: readonly string[] = Object.values(OATH)
export function oathCompleted(state: GameState, id: string) {
  return (state.completedOaths ?? []).includes(id)
}

export function permanentDieBonus(state: GameState) {
  return oathCompleted(state, OATH.conqueror) ? 1 : 0
}
