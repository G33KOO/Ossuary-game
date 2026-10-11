import { ARMOR_SLOTS, card, printedPower } from './data'
import type { ClassName } from './data'
import type { Combat, GameState } from './types'

export function hasFlag(combat: Combat, flag: string) {
  return combat.flags.includes(flag)
}

export function activeClass(state: GameState): ClassName {
  return state.mimic ?? state.klass
}

export function artifactBoosts(state: GameState, klass: ClassName) {
  const artifact = state.equipment.artifact
  return artifact !== null && (card(artifact).requirement ?? '').includes(`Classe : ${klass}`)
}

export function handLimit(state: GameState) {
  return state.race === 'Humain' ? 6 : 5
}

export function equippedIds(state: GameState) {
  const { armors, hands, artifact } = state.equipment
  const ids: string[] = []
  for (const slot of ARMOR_SLOTS) {
    const id = armors[slot]
    if (id) ids.push(id)
  }
  ids.push(...hands)
  if (artifact) ids.push(artifact)
  return ids
}

export function weaponPower(state: GameState, id: string) {
  const mastered = (card(id).requirement ?? '').includes(`Maîtrise ${state.klass}`)
  return printedPower(id) * (mastered ? 2 : 1) + (state.race === 'Orc' ? 1 : 0)
}

type Item = { id: string; kind: 'armor' | 'weapon'; power: number }

function equipmentItems(state: GameState, combat: Combat | null): Item[] {
  const items: Item[] = []
  for (const slot of ARMOR_SLOTS) {
    const id = state.equipment.armors[slot]
    if (!id || id === combat?.stolenArmor) continue
    const doubled = combat?.doubledArmors.includes(id) ? 2 : 1
    items.push({ id, kind: 'armor', power: printedPower(id) * doubled })
  }
  for (const id of state.equipment.hands) {
    items.push({ id, kind: 'weapon', power: weaponPower(state, id) })
  }
  return items
}

export function strongestEquipmentPower(state: GameState) {
  return Math.max(0, ...equipmentItems(state, null).map((item) => item.power))
}

export function playerEquipmentPower(state: GameState, combat: Combat | null) {
  if (combat && hasFlag(combat, 'ignoreAll')) return 0
  let items = equipmentItems(state, combat)
  if (combat && hasFlag(combat, 'ignoreArmors')) {
    items = items.filter((item) => item.kind !== 'armor')
  }
  if (combat && combat.ignoredStrongest > 0) {
    const sorted = [...items].sort((a, b) => b.power - a.power)
    const ignored = new Set(sorted.slice(0, combat.ignoredStrongest).map((item) => item.id))
    items = items.filter((item) => !ignored.has(item.id))
  }
  if (combat && hasFlag(combat, 'ignoreWeapons')) {
    items = items.filter((item) => item.kind !== 'weapon')
  }
  const armors = items.filter((item) => item.kind === 'armor').reduce((sum, item) => sum + item.power, 0)
  const weapons = items.filter((item) => item.kind === 'weapon').reduce((sum, item) => sum + item.power, 0)
  const malus = combat?.armorMalus ?? 0
  return Math.max(0, armors - malus) + weapons
}

export function bossEquipmentPower(combat: Combat) {
  if (combat.bossEquip.length === 0) return 0
  let total = 0
  for (const id of combat.bossEquip) {
    const type = card(id).type
    if (type === 'Armure' && hasFlag(combat, 'bossIgnoreArmors')) continue
    if (type === 'Arme' && hasFlag(combat, 'bossIgnoreWeapons')) continue
    total += printedPower(id)
  }
  return total
}

export type PowerBreakdown = {
  level: number
  equipment: number
  bonus: number
  die: number | null
  total: number
}

export type CombatPower = { player: PowerBreakdown; opponent: PowerBreakdown }

export function computePower(state: GameState): CombatPower | null {
  const combat = state.combat
  if (!combat) return null

  const level = hasFlag(combat, 'levelZero') ? 0 : state.level
  const equipment = playerEquipmentPower(state, combat)
  const playerDie = combat.playerDie ?? null
  const player: PowerBreakdown = {
    level,
    equipment,
    bonus: combat.playerBonus,
    die: playerDie,
    total: level + equipment + combat.playerBonus + (playerDie ?? 0),
  }

  let base = 0
  if (combat.kind === 'boss') {
    base = 20 + bossEquipmentPower(combat)
  } else {
    for (const id of combat.monsters) {
      const monster = card(id)
      base += printedPower(id)
      if (monster.opponentBonus.includes(`${state.race}s`)) {
        base += Number.parseInt(monster.opponentBonus, 10) || 0
      }
    }
  }
  const opponentBonus = combat.monsterBonus + combat.bossBonus
  const opponentDie = combat.bossDie ?? null
  const opponent: PowerBreakdown = {
    level: 0,
    equipment: base,
    bonus: opponentBonus,
    die: opponentDie,
    total: base + opponentBonus + (opponentDie ?? 0),
  }

  return { player, opponent }
}
