import { card } from './data'
import type { Combat } from './types'

/** Rewards fixed by the combat state, before post-victory rolls or choices. */
export function combatRewards(combat: Combat, tie = false) {
  const monsters = combat.monsters.map(card)
  const sporule = monsters.some(monster => monster.name === 'Sporule')
  const immaculate = monsters.some(monster => monster.name === 'Immaculée') && combat.playerDie === 6
  const tieLoot = tie && monsters.some(monster => monster.name === 'Cisailleur') ? 1 : 0
  const multiplier = combat.lootMultiplier * (immaculate ? 2 : 1)
  const levels = sporule ? 0 : monsters.reduce((sum, monster) => sum + (Number.parseInt(monster.levelGain, 10) || 0), 0)
  const baseLoot = monsters.reduce((sum, monster) => sum + (Number.parseInt(monster.loot, 10) || 0), 0) + tieLoot
  return { levels, loot: sporule || combat.forgoLoot ? 0 : baseLoot * multiplier, multiplier, tieLoot, immaculate, sporule }
}
