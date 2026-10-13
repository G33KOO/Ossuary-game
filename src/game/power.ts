import { ARMOR_SLOTS, card, printedPower } from './data'
import type { ClassName } from './data'
import type { Combat, GameState } from './types'
import { OATH, oathCompleted } from './oaths'

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
  return state.race === 'Humain' || oathCompleted(state, OATH.burden) ? 6 : 5
}

export function equippedIds(state: GameState) {
  const { armors, hands, artifact } = state.equipment
  const ids: string[] = []
  for (const slot of ARMOR_SLOTS) {
    const id = armors[slot]
    if (id) ids.push(id)
  }
  ids.push(...hands)
  if (state.equipment.extraArmor?.id) ids.push(state.equipment.extraArmor.id)
  if (artifact) ids.push(artifact)
  return ids
}

export function weaponPower(state: GameState, id: string) {
  const mastered = isMasteredWeapon(card(id), state.klass) || oathCompleted(state, OATH.foreignIron)
  return printedPower(id) * (mastered ? 2 : 1) + (state.race === 'Orc' ? 1 : 0)
}

export function isMasteredWeapon(entry: { type: string; requirement: string | null }, klass: ClassName) {
  return entry.type === 'Arme' && (entry.requirement ?? '').includes(`Maîtrise ${klass}`)
}

type Item = { id: string; kind: 'armor' | 'weapon'; power: number }

export function equipmentCardPower(state: GameState, id: string, combat: Combat | null = state.combat) {
  const entry = card(id)
  if (entry.type === 'Arme') {
    let power = weaponPower(state, id)
    if (entry.name === 'Masse Mille-Clous' && state.equipment.hands.length === 1) power += printedPower(id)
    if (entry.name === 'Hache Brise-Enclume à deux mains' && combat?.kind === 'boss') power += 2
    if (combat?.kind === 'monster') {
      if (entry.name === 'Masse Nautile' && combat.monsters.some((monster) => [4, 6, 7].includes(printedPower(monster)))) power += 1
      if (entry.name === 'Hache Léviathan à deux mains' && combat.monsters.some((monster) => printedPower(monster) >= 15)) power += 1
    }
    return power
  }
  if (entry.type === 'Armure') return printedPower(id) * (combat?.doubledArmors.includes(id) ? 2 : 1)
  return printedPower(id)
}

function equipmentItems(state: GameState, combat: Combat | null): Item[] {
  const items: Item[] = []
  for (const slot of ARMOR_SLOTS) {
    const id = state.equipment.armors[slot]
    if (!id || id === combat?.stolenArmor) continue
    items.push({ id, kind: 'armor', power: equipmentCardPower(state, id, combat) })
  }
  const extra = state.equipment.extraArmor?.id
  if (extra && extra !== combat?.stolenArmor) items.push({ id: extra, kind: 'armor', power: equipmentCardPower(state, extra, combat) })
  for (const id of state.equipment.hands) {
    items.push({ id, kind: 'weapon', power: equipmentCardPower(state, id, combat) })
  }
  return items
}

export function strongestEquipmentPower(state: GameState) {
  return Math.max(0, ...equipmentItems(state, state.combat).map((item) => item.power))
}

export function playerEquipmentPower(state: GameState, combat: Combat | null) {
  if (combat && hasFlag(combat, 'ignoreAll')) return 0
  let items = equipmentItems(state, combat)
  if (combat?.ignoredEquipment?.length) items = items.filter((item) => !combat.ignoredEquipment!.includes(item.id))
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
    total += bossEquipmentCardPower(combat, id)
  }
  return total
}

export function bossEquipmentCardPower(combat: Combat, id: string) {
  const entry = card(id)
  let power = printedPower(id)
  if (entry.name === 'Masse Mille-Clous' && combat.bossEquip.filter((id) => card(id).type === 'Arme').length === 1) power *= 2
  if (entry.name === 'Hache Brise-Enclume à deux mains') power += 2
  return power
}

export type PowerBreakdown = {
  level: number
  equipment: number
  bonus: number
  die: number | null
  total: number
}

export type CombatPower = { player: PowerBreakdown; opponent: PowerBreakdown }

export function computePlayerPower(state: GameState): PowerBreakdown {
  const combat = state.combat
  const level = combat && hasFlag(combat, 'levelZero') ? 0 : state.level
  const equipment = playerEquipmentPower(state, combat)
  const playerDie = combat?.playerDie ?? null
  const bonus = (combat?.playerBonus ?? 0) + (oathCompleted(state, OATH.destitution) ? 2 : 0)
  return {
    level,
    equipment,
    bonus,
    die: playerDie,
    total: level + equipment + bonus + (playerDie ?? 0),
  }
}

export function computePower(state: GameState): CombatPower | null {
  const combat = state.combat
  if (!combat) return null
  const player = computePlayerPower(state)

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
