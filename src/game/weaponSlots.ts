import { card } from './data'
import type { Equipment } from './types'

export function weaponSlots(equipment: Equipment): [string | null, string | null] {
  const [first, second] = equipment.hands
  if (first && card(first).subtype === 'Deux mains') return [first, first]
  if (first && !second && equipment.offhand === first) return [null, first]
  return [first ?? null, second ?? null]
}

export function setWeaponSlots(equipment: Equipment, slots: [string | null, string | null]) {
  // A two-handed weapon occupies both slots but remains a single physical card.
  equipment.hands = [...new Set(slots.filter((id): id is string => id !== null))]
  equipment.offhand = !slots[0] && slots[1] ? slots[1] : undefined
}

export function removeWeapon(equipment: Equipment, id: string) {
  const slots = weaponSlots(equipment)
  setWeaponSlots(equipment, [slots[0] === id ? null : slots[0], slots[1] === id ? null : slots[1]])
}
