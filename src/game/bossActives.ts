import { CLASS_NAMES, card, printedPower, type ClassName } from './data'
import { bossEquipmentCardPower, equipmentCardPower } from './power'
import type { Combat, GameState } from './types'

export type BossActivePlan = { klass: ClassName; cost: string[]; gain: number; target?: string; replacement?: string }

// Only powers legal during an ongoing duel are candidates (Pistage is pre-combat).
export function planBossActive(s: GameState, c: Combat, klass: ClassName, excluded?: string): BossActivePlan | undefined {
  const hand = c.bossHand.filter(id => id !== excluded)
  const costs = [...hand].sort((a, b) => (card(a).type === 'Action' ? 10 : printedPower(a)) - (card(b).type === 'Action' ? 10 : printedPower(b)))
  switch (klass) {
    case 'Guerrier': {
      const weapon = hand.filter(id => card(id).type === 'Arme').sort((a, b) => printedPower(b) - printedPower(a))[0]
      if (weapon) return { klass, cost: [weapon], gain: printedPower(weapon) }
      break
    }
    case 'Druide': {
      const cost = costs.find(id => card(id).type === 'Armure')
      const target = c.bossEquip.filter(id => card(id).type === 'Armure' && !c.bossDoubledArmors?.includes(id)).sort((a, b) => printedPower(b) - printedPower(a))[0]
      if (cost && target && printedPower(target) > 0) return { klass, cost: [cost], target, gain: printedPower(target) }
      break
    }
    case 'Mage':
      if (costs.length && c.bossDie !== null && c.bossDie < (c.bossSides + 1) / 2 + (c.bossDieModifier ?? 0)) return { klass, cost: costs.slice(0, 1), gain: (c.bossSides + 1) / 2 + (c.bossDieModifier ?? 0) - c.bossDie }
      break
    case 'Nécromancien': {
      if (c.bossUsedActives?.includes(klass) || costs.length < 3) break
      const target = s.monsterDiscard.slice(-3).sort((a, b) => printedPower(b) - printedPower(a))[0]
      if (target && printedPower(target) >= 2) return { klass, cost: costs.slice(0, 3), target, gain: Math.floor(printedPower(target) / 2) }
      break
    }
    case 'Voleur': {
      if (c.bossUsedActives?.includes(klass) || costs.length < 2) break
      const targets = [...Object.values(s.equipment.armors).filter((id): id is string => Boolean(id)), ...s.equipment.hands, ...(s.equipment.extraArmor?.id ? [s.equipment.extraArmor.id] : [])]
      const exchanges = c.bossEquip.flatMap(replacement => targets.filter(target => card(target).type === card(replacement).type && card(target).subtype === card(replacement).subtype).map(target => ({ klass, cost: costs.slice(0, 2), target, replacement, gain: bossEquipmentCardPower(c, target) - bossEquipmentCardPower(c, replacement) + equipmentCardPower(s, target, c) - equipmentCardPower(s, replacement, c) })))
      const best = exchanges.sort((a, b) => b.gain - a.gain)[0]
      if (best?.gain > 0) return best
      break
    }
  }
}

export function bestBossActive(s: GameState, c: Combat, excluded: string) {
  return CLASS_NAMES.filter(klass => !c.bossActives?.[klass]).map(klass => planBossActive(s, c, klass, excluded)).filter((plan): plan is BossActivePlan => Boolean(plan)).sort((a, b) => b.gain - a.gain)[0]
}
