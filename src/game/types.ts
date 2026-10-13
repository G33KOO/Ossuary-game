import type { ClassName, RaceName } from './data'

export type Phase = 'main' | 'combat' | 'won' | 'lost'

export type LogEntry = { code: string; params?: Record<string, string | number> }

export type PromptOption = { id: string; cardId?: string }

export type PromptPurpose =
  | 'discard-excess'
  | 'discard-one'
  | 'destroy-equip'
  | 'tribute-loot'
  | 'tribute-power'
  | 'creator'
  | 'fournaise'
  | 'sporule'
  | 'fielpeau'
  | 'fumefange'
  | 'aiguemorte'
  | 'pay'
  | 'hunter-pick'
  | 'thief-pick'
  | 'necro-pick'
  | 'warrior-pick'
  | 'mage-keep'
  | 'vow'
  | 'mimic'
  | 'envers'
  | 'tavern'
  | 'oath'
  | 'oath-armor-slot'
  | 'oath-boss-action'
  | 'tavern-give'
  | 'weapon-loot'
  | 'druid-pick'
  | 'hunter-target'
  | 'hunter-boss-pick'
  | 'ignore-equipment'
  | 'boss-destroy'

export type Prompt = {
  purpose: PromptPurpose
  options: PromptOption[]
  optional: boolean
  ctx: Record<string, string | number | string[]>
}

export type Equipment = {
  extraArmor?: { slot: string; id: string | null }
  armors: Record<string, string | null>
  hands: string[]
  artifact: string | null
}

export type Combat = {
  resolvedActions?: number
  hasRolled?: boolean
  oathRerollUsed?: boolean
  kind: 'monster' | 'boss'
  monsters: string[]
  bossId: string | null
  bossHand: string[]
  bossEquip: string[]
  bossSides: 6 | 8
  bossBonus: number
  playerBonus: number
  monsterBonus: number
  playerDie: number | null
  bossDie: number | null
  flags: string[]
  ignoredStrongest: number
  ignoredEquipment?: string[]
  armorMalus: number
  stolenArmor: string | null
  doubledArmors: string[]
  actionsPlayed: number
  used: string[]
  rounds: number
  lootMultiplier: number
  forgoLoot: boolean
  destroyAfter: boolean
  fielpeauDone: boolean
  fournaiseSkipped: boolean
}

export type GameState = {
  retainedMonsters?: string[]
  forcedMonsterId?: string | null
  seed: number
  phase: Phase
  klass: ClassName
  race: RaceName
  level: number
  turn: number
  hand: string[]
  oaths: string[]
  completedOaths?: string[]
  excessDiscarded?: number
  arcanaRewardUsed?: boolean
  equipment: Equipment
  lootDeck: string[]
  lootDiscard: string[]
  monsterDeck: string[]
  monsterDiscard: string[]
  strongMonsters: string[]
  strongAdded: boolean
  dieSides: 6 | 8
  mimic: ClassName | null
  turnFlags: string[]
  nextMonsterPenalty: number
  bossPressure: number
  tavernDone: boolean
  combat: Combat | null
  promptQueue: Prompt[]
  endTurnPending: boolean
  log: LogEntry[]
  stats: { monsters: number; defeats: number; flees: number }
  victoryBoss: string | null
  draws: { id: string; kind: 'loot' | 'monster' }[]
  drawSeq: number
}

export type GameAction =
  | { t: 'equip'; id: string }
  | { t: 'unequip'; id: string }
  | { t: 'fightMonster' }
  | { t: 'drawLoot' }
  | { t: 'challengeBoss'; bossId: string }
  | { t: 'drawBoss' }
  | { t: 'playAction'; id: string }
  | { t: 'useActive' }
  | { t: 'roll' }
  | { t: 'oathReroll' }
  | { t: 'weaponReroll'; id: string }
  | { t: 'resolve' }
  | { t: 'bossStep' }
  | { t: 'flee' }
  | { t: 'answer'; option: string | null }
