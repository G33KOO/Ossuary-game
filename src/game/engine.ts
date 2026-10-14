import { combatRewards } from './combatRewards'
import { bestBossActive, planBossActive } from './bossActives'
import { removeWeapon, setWeaponSlots, weaponSlots } from './weaponSlots'
import { ARMOR_SLOTS, CARDS, COMBAT_ONLY_ACTIONS, SOLO_EXCLUDED_ACTIONS, card, printedPower } from './data'
import type { ClassName, RaceName } from './data'
import { activeClass, artifactBoosts, equippedIds, handLimit, hasFlag, isMasteredWeapon, strongestEquipmentPower, computePower, equipmentCardPower } from './power'
import { randomInt, shuffle } from './rng'
import type { Combat, DiceRoll, GameAction, GameState, LogEntry, Prompt, PromptOption } from './types'
import { OATH, SOLO_OATH_IDS, oathCompleted, permanentDieBonus } from './oaths'

const MAX_LEVEL = 10
const BOSS_LEVEL = 10
const TAVERN_SIZE = 3

export const BOSS_IDS = CARDS.filter((entry) => entry.type === 'Boss').map((entry) => entry.id)

function log(s: GameState, code: string, params?: LogEntry['params']) {
  s.log.push(params ? { code, params } : { code })
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400)
}

function cardName(id: string) {
  return card(id).name
}

function newCombat(kind: Combat['kind']): Combat {
  return {
    kind,
    monsters: [],
    bossId: null,
    bossHand: [],
    bossEquip: [],
    bossSides: 6,
    bossBonus: 0,
    playerBonus: 0,
    monsterBonus: 0,
    playerDie: null,
    bossDie: null,
    flags: [],
    ignoredStrongest: 0,
    armorMalus: 0,
    stolenArmor: null,
    doubledArmors: [],
    actionsPlayed: 0,
    resolvedActions: 0,
    hasRolled: false,
    oathRerollUsed: false,
    used: [],
    rounds: 1,
    lootMultiplier: 1,
    forgoLoot: false,
    destroyAfter: false,
    fielpeauDone: false,
    fournaiseSkipped: false,
  }
}

export function newGame(klass: ClassName, race: RaceName, seed = Math.floor(Math.random() * 2 ** 31)): GameState {
  const s = { seed } as GameState
  const loot = CARDS.filter((entry) => {
    if (entry.type === 'Armure' || entry.type === 'Arme') return true
    if (entry.type === 'Action') return !SOLO_EXCLUDED_ACTIONS.has(entry.name)
    if (entry.type === 'Artefact de classe') return (entry.requirement ?? '').includes(`Classe : ${klass}`)
    return false
  }).map((entry) => entry.id)
  const monsters = CARDS.filter((entry) => entry.type === 'Monstre')

  s.phase = 'main'
  s.klass = klass
  s.race = race
  s.level = 1
  s.turn = 1
  s.lootDeck = shuffle(s, loot)
  s.lootDiscard = []
  s.monsterDeck = shuffle(s, monsters.filter((entry) => printedPower(entry.id) < 15).map((entry) => entry.id))
  s.monsterDiscard = []
  s.strongMonsters = monsters.filter((entry) => printedPower(entry.id) >= 15).map((entry) => entry.id)
  s.strongAdded = false
  s.dieSides = 6
  s.mimic = null
  s.turnFlags = []
  s.nextMonsterPenalty = 0
  s.bossPressure = 0
  s.counterspellsEnabled = true
  s.bossEnrageArmed = false
  s.tavernDone = false
  s.combat = null
  s.promptQueue = []
  s.endTurnPending = false
  s.endTurnRequested = false
  s.log = []
  s.stats = { monsters: 0, defeats: 0, flees: 0 }
  s.victoryBoss = null
  s.equipment = { armors: { Plastron: null, Bottes: null, Gants: null, Casque: null }, hands: [], artifact: null }
  s.hand = []
  s.draws = []
  s.drawSeq = 0
  drawLoot(s, race === 'Humain' ? 6 : 5)
  s.draws = []
  s.oaths = []
  s.completedOaths = []
  s.excessDiscarded = 0
  s.arcanaRewardUsed = false
  const oathPool = shuffle(
    s,
    [...SOLO_OATH_IDS],
  )
  const oathChoices = oathPool.slice(0, 3)
  if (oathChoices.length > 0) {
    queue(s, {
      purpose: 'oath',
      options: oathChoices.map((id) => ({ id, cardId: id })),
      optional: false,
      ctx: { choices: oathChoices, keep: race === 'Revenant' ? 2 : 1 },
    })
  }
  log(s, 'start', { klass, race })
  return s
}

function drawFromLoot(s: GameState) {
  if (s.lootDeck.length === 0 && s.lootDiscard.length > 0) {
    s.lootDeck = shuffle(s, s.lootDiscard)
    s.lootDiscard = []
    log(s, 'lootReshuffled')
  }
  return s.lootDeck.shift()
}

function drawLoot(s: GameState, count: number) {
  for (let index = 0; index < count; index += 1) {
    const id = drawFromLoot(s)
    if (!id) break
    s.hand.push(id)
    s.draws.push({ id, kind: 'loot' })
  }
}

export function retireWeakMonsters(s: GameState) {
  if (!s.strongAdded) return
  const retired = s.monsterDeck.filter((id) => [4, 6, 7].includes(printedPower(id)))
  if (!retired.length) return
  s.removedMonsters = [...(s.removedMonsters ?? []), ...retired]
  s.monsterDeck = s.monsterDeck.filter((id) => ![4, 6, 7].includes(printedPower(id)))
}

function drawMonster(s: GameState) {
  retireWeakMonsters(s)
  if (s.monsterDeck.length === 0 && s.monsterDiscard.length > 0) {
    s.monsterDeck = shuffle(s, s.monsterDiscard)
    s.monsterDiscard = []
    log(s, 'monstersReshuffled')
    retireWeakMonsters(s)
  }
  const id = s.monsterDeck.shift()
  if (id) s.draws.push({ id, kind: 'monster' })
  return id
}


function diceRoll(s: GameState, sides: number, bonus = 0, mode: DiceRoll['mode'] = 'single'): DiceRoll {
  const raw = Array.from({ length: mode === 'single' ? 1 : 2 }, () => randomInt(s, sides))
  const natural = mode === 'sum' ? raw.reduce((sum, value) => sum + value, 0) : mode === 'lowest' ? Math.min(...raw) : raw[0]
  const modifier = bonus * (mode === 'sum' ? raw.length : 1)
  return { sides, raw, bonus: modifier, total: natural + modifier, mode }
}

function rollParams(roll: DiceRoll): Record<string, string | number> {
  return { sides: roll.sides, raw: roll.raw.join(','), bonus: roll.bonus, value: roll.total, mode: roll.mode }
}

function playerEffectRoll(s: GameState, c: Combat | null) {
  return rollPlayerDice(s, s.dieSides, c && hasFlag(c, 'wyrm') ? 'lowest' : 'single')
}

function rollPlayerDice(s: GameState, sides: number, mode: DiceRoll['mode'] = 'single', extraBonus = 0) {
  return diceRoll(s, sides, (s.race === 'Elfe' ? 1 : 0) + permanentDieBonus(s) + extraBonus, mode)
}

function combatRoll(s: GameState, c: Combat) {
  c.hasRolled = true
  c.playerRoll = rollPlayerDice(s, s.dieSides, hasFlag(c, 'doubleDie') ? 'sum' : hasFlag(c, 'wyrm') ? 'lowest' : 'single')
  c.playerDieModifier = c.playerRoll.bonus
  return c.playerRoll.total
}


function addFlag(c: Combat, flag: string) {
  if (!c.flags.includes(flag)) c.flags.push(flag)
}

function discardFromHand(s: GameState, id: string) {
  const index = s.hand.indexOf(id)
  if (index === -1) return false
  s.hand.splice(index, 1)
  s.lootDiscard.push(id)
  return true
}

function clampLevel(level: number) {
  return Math.max(1, Math.min(MAX_LEVEL, level))
}

function checkMilestone(s: GameState) {
  if (s.level >= 5 && !s.strongAdded) {
    s.strongAdded = true
    s.monsterDeck = shuffle(s, [...s.monsterDeck, ...s.strongMonsters])
    retireWeakMonsters(s)
    log(s, 'strongMonsters')
  }
}

function queue(s: GameState, prompt: Prompt, front = false) {
  if (front) s.promptQueue.unshift(prompt)
  else s.promptQueue.push(prompt)
}

function completeOath(s: GameState, id: string) {
  if (!(s.oaths ?? []).includes(id) || oathCompleted(s, id)) return
  s.completedOaths = [...(s.completedOaths ?? []), id]
  if (id === OATH.refusedAwakening) s.dieSides = 8
  if (id === OATH.secondSkin) queue(s, { purpose: 'oath-armor-slot', options: ARMOR_SLOTS.map((slot) => ({ id: slot })), optional: false, ctx: {} })
  log(s, 'oathCompleted', { card: id })
}

function completeVictoryOaths(s: GameState, c: Combat, tie: boolean) {
  const strongest = Math.max(0, ...c.monsters.map(printedPower))
  const armors = equippedIds(s).filter((id) => card(id).type === 'Armure')
  const conditions = [
    [OATH.destitution, tie],
    [OATH.exhaustedArcana, (c.resolvedActions ?? c.actionsPlayed) >= 2],
    [OATH.misfortune, c.kind === 'monster' && strongest >= 9 && c.playerDie === 1],
    [OATH.secondSkin, c.kind === 'monster' && strongest >= 15 && ARMOR_SLOTS.every((slot) => s.equipment.armors[slot]) && armors.reduce((sum, id) => sum + printedPower(id), 0) >= 8],
    [OATH.foreignIron, c.kind === 'monster' && strongest >= 15 && !s.equipment.hands.some((id) => isMasteredWeapon(card(id), s.klass))],
    [OATH.conqueror, c.kind === 'monster' && strongest >= 18 && !c.hasRolled && c.playerDie === null && c.actionsPlayed === 0 && c.used.length === 0 && !s.turnFlags.includes('hunter')],
    [OATH.refusedAwakening, c.kind === 'monster' && strongest >= 15 && s.dieSides === 6],
  ] as const
  for (const [id, fulfilled] of conditions) if (fulfilled) completeOath(s, id)
}

function replaceRefusedAwakeningOath(s: GameState) {
  if (!(s.oaths ?? []).includes(OATH.refusedAwakening) || oathCompleted(s, OATH.refusedAwakening)) return
  const available = SOLO_OATH_IDS.filter((id) => !s.oaths.includes(id))
  if (!available.length) return
  const replacement = available[randomInt(s, available.length) - 1]
  s.oaths = s.oaths.map((id) => id === OATH.refusedAwakening ? replacement : id)
  log(s, 'oathReplaced', { card: replacement })
}

function handOptions(s: GameState, filter?: (id: string) => boolean): PromptOption[] {
  return s.hand.filter((id) => !filter || filter(id)).map((id) => ({ id, cardId: id }))
}

function equippedOptions(s: GameState, armorsOnly = false): PromptOption[] {
  return equippedIds(s)
    .filter((id) => card(id).type === 'Armure' || (!armorsOnly && card(id).type === 'Arme'))
    .map((id) => ({ id, cardId: id }))
}

function queueDiscardOne(s: GameState) {
  if (s.hand.length === 0) return
  queue(s, { purpose: 'discard-one', options: handOptions(s), optional: false, ctx: {} })
}

function destroyEquipped(s: GameState, id: string, voluntary = false) {
  if (!equippedIds(s).includes(id)) return
  for (const slot of ARMOR_SLOTS) {
    if (s.equipment.armors[slot] === id) s.equipment.armors[slot] = null
  }
  removeWeapon(s.equipment, id)
  if (s.equipment.extraArmor?.id === id) s.equipment.extraArmor.id = null
  s.lootDiscard.push(id)
  log(s, 'destroyed', { card: id })
  if (!voluntary && cardName(id) === 'Masse du Bastion') {
    drawLoot(s, 1)
    log(s, 'weaponSalvage', { card: id })
  }
}

// ---------- Equipment ----------

function equip(s: GameState, id: string, hand?: 0 | 1) {
  const entry = card(id)
  if (!s.hand.includes(id)) return
  if (entry.type === 'Armure') {
    const extra = s.equipment.extraArmor
    if (extra?.slot === entry.subtype && s.equipment.armors[entry.subtype]) {
      if (extra.id) s.hand.push(extra.id)
      extra.id = id
    } else {
      const previous = s.equipment.armors[entry.subtype]
      if (previous) s.hand.push(previous)
      s.equipment.armors[entry.subtype] = id
    }
  } else if (entry.type === 'Arme') {
    const slots = weaponSlots(s.equipment)
    const twoHanded = entry.subtype === 'Deux mains'
    if (twoHanded || (slots[0] && slots[0] === slots[1])) {
      s.hand.push(...s.equipment.hands)
      slots[0] = null
      slots[1] = null
    }
    if (twoHanded) setWeaponSlots(s.equipment, [id, id])
    else {
      const target = hand ?? (!slots[0] ? 0 : !slots[1] ? 1 : 0)
      if (slots[target]) s.hand.push(slots[target]!)
      slots[target] = id
      setWeaponSlots(s.equipment, slots)
    }
  } else if (entry.type === 'Artefact de classe') {
    if (!canEquip(s, id)) return
    if (s.equipment.artifact) s.hand.push(s.equipment.artifact)
    s.equipment.artifact = id
  } else {
    return
  }
  s.hand.splice(s.hand.indexOf(id), 1)
  log(s, 'equip', { card: id })
}

export function canManageHand(s: GameState) {
  return s.promptQueue.every((prompt) => prompt.purpose === 'tavern' || prompt.purpose === 'tavern-give' || prompt.purpose === 'discard-excess')
}

export function canChangeEquipment(s: GameState) {
  if (!canManageHand(s)) return false
  if (s.phase === 'main' && !s.combat) return true
  return s.phase === 'combat' && s.combat !== null
}

export function canEquip(s: GameState, id: string) {
  if (!canChangeEquipment(s) || !s.hand.includes(id)) return false
  const entry = card(id)
  if (entry.type === 'Armure' || entry.type === 'Arme') return true
  if (entry.type === 'Artefact de classe') {
    return (entry.requirement ?? '').includes(`Classe : ${s.klass}`) && s.level >= BOSS_LEVEL
  }
  return false
}

export function canWeaponReroll(s: GameState, id: string) {
  return s.phase === 'combat' && s.promptQueue.length === 0 && s.combat?.playerDie !== null && s.combat !== null && s.equipment.hands.includes(id) && cardName(id) === 'Baguette Brasier'
}

function unequip(s: GameState, id: string) {
  if (!equippedIds(s).includes(id)) return
  for (const slot of ARMOR_SLOTS) {
    if (s.equipment.armors[slot] === id) s.equipment.armors[slot] = null
  }
  removeWeapon(s.equipment, id)
  if (s.equipment.artifact === id) s.equipment.artifact = null
  if (s.equipment.extraArmor?.id === id) s.equipment.extraArmor.id = null
  s.hand.push(id)
  log(s, 'unequip', { card: id })
}

// ---------- Combat start ----------

function fournaiseTrial(s: GameState, id: string, summoned = false) {
  const choices = [id]
  for (let index = 0; index < 2; index++) {
    const extra = drawMonster(s)
    if (extra) choices.push(extra)
  }
  const options = choices.filter((choice) => cardName(choice) !== 'Fournaise').map((choice) => ({ id: choice, cardId: choice }))
  log(s, 'fournaise')
  if (options.length) {
    queue(s, { purpose: 'fournaise', options, optional: false, ctx: { choices, summoned: summoned ? 1 : 0 } })
  } else {
    s.monsterDeck.push(...shuffle(s, choices))
    log(s, 'fournaiseNoOpponent', { card: id })
    if (!summoned) s.endTurnPending = true
  }
}

function startMonsterCombat(s: GameState, id: string, skipFournaise = false) {
  if (!skipFournaise && cardName(id) === 'Fournaise') {
    fournaiseTrial(s, id)
    return
  }

  const c = newCombat('monster')
  c.monsters = [id]
  s.combat = c
  s.phase = 'combat'
  if (s.nextMonsterPenalty > 0) {
    c.monsterBonus -= s.nextMonsterPenalty
    log(s, 'legacyPenalty', { amount: s.nextMonsterPenalty })
    s.nextMonsterPenalty = 0
  }
  log(s, 'monsterRevealed', { card: id })
  applyMonsterStart(s, c, id)
}

function applyMonsterStart(s: GameState, c: Combat, id: string) {
  const name = cardName(id)
  switch (name) {
    case 'Fouisseur':
      {
        const options = equippedOptions(s).filter((option) => card(option.id).type !== 'Artefact de classe')
        const strongest = Math.max(0, ...options.map((option) => equipmentCardPower(s, option.id)))
        const candidates = options.filter((option) => equipmentCardPower(s, option.id) === strongest)
        if (candidates.length === 1) c.ignoredEquipment = [...(c.ignoredEquipment ?? []), candidates[0].id]
        else if (candidates.length) queue(s, { purpose: 'ignore-equipment', options: candidates, optional: false, ctx: { remaining: 1 } })
      }
      break
    case 'Gobeur':
      {
        const options = equippedOptions(s).filter((option) => card(option.id).type !== 'Artefact de classe' && !c.ignoredEquipment?.includes(option.id))
        if (options.length) queue(s, { purpose: 'ignore-equipment', options, optional: false, ctx: { remaining: Math.min(2, options.length) } })
        log(s, 'monsterEffect', { card: id, count: Math.min(2, options.length) })
      }
      break
    case 'Raseciel':
      addFlag(c, 'noFlee')
      break
    case 'Cuirassé':
      addFlag(c, 'cuirasse')
      break
    case 'Lacéreur': {
      const roll = playerEffectRoll(s, c)
      const value = roll.total
      c.monsterRolls = { ...c.monsterRolls, [id]: roll }
      c.monsterBonus += value
      log(s, 'monsterRoll', { card: id, ...rollParams(roll), powerChange: value })
      break
    }
    case 'Tranchebec': {
      const roll = diceRoll(s, 6)
      const value = roll.total
      c.monsterRolls = { ...c.monsterRolls, [id]: roll }
      if (value >= 4) c.monsterBonus += 2
      log(s, 'monsterRoll', { card: id, ...rollParams(roll), powerChange: value >= 4 ? 2 : 0 })
      break
    }
    case 'Rafistolé': {
      const roll = diceRoll(s, 6)
      const value = roll.total
      c.monsterRolls = { ...c.monsterRolls, [id]: roll }
      c.monsterBonus += value <= 2 ? -2 : value >= 5 ? 2 : 0
      log(s, 'monsterRoll', { card: id, ...rollParams(roll), powerChange: value <= 2 ? -2 : value >= 5 ? 2 : 0 })
      break
    }
    case 'Hurlemort':
      addFlag(c, 'levelZero')
      break
    case 'Dévoreur':
      addFlag(c, 'noActive')
      break
    case 'Exarque':
      c.monsterBonus += 2
      addFlag(c, 'tieLoses')
      break
    case 'Souriant':
      addFlag(c, 'levelZero')
      addFlag(c, 'ignoreAll')
      addFlag(c, 'doubleDie')
      c.playerDie = combatRoll(s, c)
      log(s, 'souriantRolled', { card: id, ...rollParams(c.playerRoll!) })
      break
    case 'Encloué':
      addFlag(c, 'noChanceForce')
      break
    case 'Mordefiel':
      addFlag(c, 'noActions')
      break
    case 'Wyrm':
      addFlag(c, 'wyrm')
      break
    case 'Broyeur':
      c.rounds = 2
      break
    case 'Golem':
      addFlag(c, 'golem')
      break
    case 'Balancier':
      c.armorMalus = 2
      break
    case 'Rouage':
      c.monsterBonus += strongestEquipmentPower(s)
      break
    case 'Molosse':
      addFlag(c, 'molosse')
      break
    case 'Fielpeau':
      addFlag(c, 'fielpeau')
      break
    case 'Fournaise': {
      c.monsters = c.monsters.filter((monster) => monster !== id)
      fournaiseTrial(s, id, true)
      break
    }
    case 'Cataclysme':
      queueDiscardOne(s)
      break
    case 'Le Créateur':
      c.monsterBonus += 3
      if (s.hand.length > 0) {
        queue(s, { purpose: 'creator', options: handOptions(s), optional: true, ctx: {} })
      }
      break
    case 'Féticheur':
      if (s.hand.length > 0) {
        queue(s, { purpose: 'tribute-loot', options: [...handOptions(s), { id: 'decline' }], optional: false, ctx: {} })
      } else {
        c.forgoLoot = true
      }
      break
    case 'Sauvageonne':
      if (s.hand.length > 0) {
        queue(s, { purpose: 'tribute-power', options: [...handOptions(s), { id: 'decline' }], optional: false, ctx: {} })
      } else {
        c.playerBonus -= 3
      }
      break
    case 'Fumefange':
      queue(s, { purpose: 'fumefange', options: [...equippedOptions(s), { id: 'flee' }], optional: false, ctx: {} })
      break
    case 'Aiguemorte':
      queue(s, { purpose: 'aiguemorte', options: [{ id: 'ignore-armors' }, { id: 'destroy-after' }], optional: false, ctx: {} })
      break
    default:
      break
  }
}

// ---------- Boss duel ----------

const BOSS_PRIORITY = ['Force', 'Chance', 'Éveil']

function startBoss(s: GameState, bossId: string) {
  const c = newCombat('boss')
  c.bossId = bossId
  const bossName = cardName(bossId)
  const hand: string[] = []
  const aside: string[] = []
  const handSize = 5 + s.bossPressure
  while (hand.length < handSize) {
    const id = drawFromLoot(s)
    if (!id) break
    if (card(id).type === 'Artefact de classe') aside.push(id)
    else hand.push(id)
  }
  s.lootDeck = shuffle(s, [...s.lootDeck, ...aside])
  log(s, 'bossChallenged', { card: bossId })

  if (bossName === 'Le Parfait') {
    const options = s.lootDiscard.filter((id) => card(id).type === 'Action').slice(-3)
    const best = [...options].sort((a, b) => priority(cardName(a)) - priority(cardName(b)))[0]
    if (best) {
      s.lootDiscard.splice(s.lootDiscard.lastIndexOf(best), 1)
      hand.push(best)
      log(s, 'bossRecovers', { card: best })
    }
  }

  c.bossHand = [...hand]
  bossEquipDraws(c)
  let rest = [...c.bossHand]
  const spare = () =>
    rest.filter((id) => {
      const name = cardName(id)
      if (name === 'Mimétisme') return !bestBossActive(s, c, id)
      if (name.startsWith('Voie du ')) return !planBossActive(s, c, name.slice('Voie du '.length) as ClassName, id)
      return !BOSS_PRIORITY.includes(name) && !BOSS_REACTIONS.includes(name)
    }).sort((a, b) => cardValue(a) - cardValue(b))

  switch (bossName) {
    case 'L’Invaincu': {
      const preferred = spare()
      const placed = [...preferred, ...rest.filter(id => !preferred.includes(id))].slice(0, 2)
      rest = rest.filter((id) => !placed.includes(id))
      s.lootDiscard.push(...placed)
      c.bossBonus += placed.length * 2
      log(s, 'bossStack', { count: placed.length })
      break
    }
    case 'La Suzeraine':
      queue(s, { purpose: 'suzeraine', options: [{ id: 'boss-bonus' }, { id: 'cancel-action' }], optional: false, ctx: {} })
      break
    case 'Le Martyr': {
      const preferred = spare()
      const give = [...preferred, ...rest.filter(id => !preferred.includes(id))].slice(0, 2)
      const count = Math.min(give.length, s.hand.length)
      const given = give.slice(0, count)
      for (let index = 0; index < count; index += 1) {
        const taken = s.hand.splice(randomInt(s, s.hand.length) - 1, 1)[0]
        rest.push(taken)
      }
      rest = rest.filter((id) => !given.includes(id))
      s.hand.push(...given)
      c.bossBonus += count
      log(s, 'bossSwap', { count })
      break
    }
    case 'Zénith': {
      const preferred = spare()
      const discard = [...preferred, ...rest.filter(id => !preferred.includes(id))].slice(0, 3)
      if (discard.length === 3) {
        rest = rest.filter((id) => !discard.includes(id))
        s.lootDiscard.push(...discard)
        const recent = s.monsterDiscard.slice(-5).sort((a, b) => printedPower(a) - printedPower(b))[0]
        if (recent) {
          c.bossBonus += printedPower(recent)
          log(s, 'bossAscension', { card: recent })
        }
      }
      break
    }
    case 'L’Envers': {
      const armor = equippedIds(s).filter((id) => card(id).type === 'Armure')
        .sort((a, b) => equipmentCardPower(s, b, c) - equipmentCardPower(s, a, c))[0]
      if (armor) {
        queue(s, { purpose: 'envers', options: [...handOptions(s), { id: 'decline' }], optional: false, ctx: { armor, armorPower: equipmentCardPower(s, armor, c) } })
      }
      break
    }
    default:
      break
  }

  c.bossHand = rest
  s.combat = c
  s.phase = 'combat'
  if (oathCompleted(s, OATH.exhaustedArcana) && !s.arcanaRewardUsed) {
    s.arcanaRewardUsed = true
    const actions = s.lootDiscard.filter((id) => card(id).type === 'Action').slice(-5)
    if (actions.length) queue(s, { purpose: 'oath-boss-action', options: actions.map((id) => ({ id, cardId: id })), optional: false, ctx: {} })
  }
}

function priority(name: string) {
  const index = BOSS_PRIORITY.indexOf(name)
  return index === -1 ? BOSS_PRIORITY.length : index
}

function cardValue(id: string) {
  return card(id).type === 'Action' ? 3 : printedPower(id)
}

function rollBossDie(s: GameState, c: Combat) {
  c.bossRoll = diceRoll(s, c.bossSides)
  const value = c.bossRoll.total
  c.bossDie = value
  log(s, 'bossRolled', { card: c.bossId ?? '', ...rollParams(c.bossRoll) })
}

const BOSS_REACTIONS = ['Force', 'Éveil', 'Trouvaille', 'Providence', 'Vœu', 'Destruction', 'Corrosion', 'Dépossession', 'Brise-armure', 'Faiblesse', 'Peur', 'Chance', 'Malchance', 'Contre-sort', 'Mimétisme', ...CARDS.filter(entry => entry.name.startsWith('Voie du ')).map(entry => entry.name)]

function playerGear(s: GameState) {
  const items: { id: string; power: number; weapon: boolean }[] = []
  for (const slot of ARMOR_SLOTS) {
    const id = s.equipment.armors[slot]
    if (id) items.push({ id, power: printedPower(id), weapon: false })
  }
  for (const id of s.equipment.hands) items.push({ id, power: printedPower(id), weapon: true })
  if (s.equipment.extraArmor?.id) items.push({ id: s.equipment.extraArmor.id, power: printedPower(s.equipment.extraArmor.id), weapon: false })
  return items.sort((a, b) => b.power - a.power)
}

// The Boss plays one card that can change the duel's outcome; returns false once it has nothing left to play.
function bossEquipDraws(c: Combat) {
  const pool = [...c.bossHand, ...c.bossEquip]
  const equip: string[] = []
  for (const slot of ARMOR_SLOTS) {
    const best = pool.filter(id => card(id).type === 'Armure' && card(id).subtype === slot).sort((a, b) => printedPower(b) - printedPower(a))[0]
    if (best) equip.push(best)
  }
  let hands = 0
  for (const id of pool.filter(id => card(id).type === 'Arme').sort((a, b) => printedPower(b) - printedPower(a))) {
    const size = card(id).subtype === 'Deux mains' ? 2 : 1
    if (hands + size <= 2) { equip.push(id); hands += size }
  }
  c.bossEquip = equip
  c.bossHand = pool.filter(id => !equip.includes(id))
}

function applyBossCard(s: GameState, c: Combat, id: string, target?: string) {
  const name = cardName(id)
  if (name === 'Mimétisme' || name.startsWith('Voie du ')) {
    const klass = target as ClassName
    c.bossActives = { ...c.bossActives, [klass]: id }
    log(s, 'bossAcquiresActive', { card: id, klass })
    return
  }
  switch (cardName(id)) {
    case 'Force': c.bossBonus += 2; break
    case 'Éveil': c.bossSides = 8; break
    case 'Destruction': case 'Corrosion':
      if (target) { destroyEquipped(s, target); log(s, 'playerItemDestroyed', { card: target }) }
      break
    case 'Dépossession': addFlag(c, 'ignoreWeapons'); break
    case 'Brise-armure': addFlag(c, 'ignoreArmors'); break
    case 'Faiblesse': c.playerBonus -= 2; break
    case 'Chance':
      if (c.bossDie !== null) { c.bossDie += 2; c.bossDieModifier = (c.bossDieModifier ?? 0) + 2 }
      break
    case 'Malchance':
      if (c.playerDie !== null) { const before = c.playerDie; c.playerDie = Math.max(0, before - 2); c.playerDieModifier = (c.playerDieModifier ?? 0) + c.playerDie - before }
      break
    case 'Trouvaille': case 'Providence': {
      let count = 0
      for (let i = 0; i < (cardName(id) === 'Providence' ? 3 : 2); i++) { const drawn = drawFromLoot(s); if (drawn) { c.bossHand.push(drawn); count++ } }
      bossEquipDraws(c)
      log(s, 'bossDraws', { card: id, count })
      break
    }
    case 'Vœu': {
      const wanted = s.lootDeck.find(id => card(id).type === 'Action' && BOSS_REACTIONS.includes(cardName(id)) && !(c.bossPlayedCards ?? []).includes(id))
      if (wanted) { s.lootDeck.splice(s.lootDeck.indexOf(wanted), 1); c.bossHand.push(wanted); s.lootDeck = shuffle(s, s.lootDeck); log(s, 'bossDraws', { card: id, count: 1 }) }
      break
    }
    case 'Peur':
      s.lootDiscard.push(...c.bossHand, ...c.bossEquip)
      c.bossHand = []; c.bossEquip = []
      s.stats.flees += 1
      log(s, 'bossFear', { card: id })
      endCombat(s, c)
      break
  }
}

function activateBossPower(s: GameState, c: Combat): boolean {
  for (const [klass, source] of Object.entries(c.bossActives ?? {})) {
    const plan = planBossActive(s, c, klass as ClassName)
    if (!plan) continue
    c.bossHand = c.bossHand.filter(id => !plan.cost.includes(id))
    s.lootDiscard.push(...plan.cost)
    const before = computePower(s)!.opponent.total
    switch (plan.klass) {
      case 'Guerrier': case 'Nécromancien': c.bossBonus += plan.gain; break
      case 'Druide': c.bossDoubledArmors = [...(c.bossDoubledArmors ?? []), plan.target!]; break
      case 'Mage': {
        const oldDie = c.bossDie!
        const oldRoll = c.bossRoll
        const modifier = c.bossDieModifier ?? 0
        const roll = diceRoll(s, c.bossSides)
        const fresh = roll.total + modifier
        if (fresh > oldDie) { c.bossRoll = roll; c.bossDie = fresh }
        else c.bossRoll = oldRoll
        log(s, 'bossActiveRoll', { card: source!, ...rollParams(roll), old: oldDie, kept: c.bossDie! })
        break
      }
      case 'Voleur': {
        const { target, replacement } = plan
        c.bossEquip = c.bossEquip.map(id => id === replacement ? target! : id)
        for (const slot of ARMOR_SLOTS) if (s.equipment.armors[slot] === target) s.equipment.armors[slot] = replacement!
        if (s.equipment.extraArmor && s.equipment.extraArmor.id === target) s.equipment.extraArmor.id = replacement!
        setWeaponSlots(s.equipment, weaponSlots(s.equipment).map(id => id === target ? replacement! : id) as [string | null, string | null])
        break
      }
    }
    c.bossUsedActives = [...(c.bossUsedActives ?? []), plan.klass]
    log(s, 'bossActive', { card: source!, klass: plan.klass, cost: plan.cost.join(','), target: plan.target ?? '', replacement: plan.replacement ?? '', powerChange: computePower(s)!.opponent.total - before })
    return true
  }
  return false
}

function bossReact(s: GameState, c: Combat): boolean {
  if (c.kind !== 'boss' || s.combat !== c || s.promptQueue.length) return false
  const gear = playerGear(s)
  for (const name of BOSS_REACTIONS) {
    if (name === 'Contre-sort') continue
    const id = c.bossHand.find(handId => cardName(handId) === name && !(c.bossPlayedCards ?? []).includes(handId))
    if (!id) continue
    let target: string | undefined
    switch (name) {
      case 'Mimétisme': {
        const plan = bestBossActive(s, c, id)
        if (!plan || c.bossActives?.[plan.klass]) continue
        target = plan.klass
        break
      }
      case 'Éveil': if (c.bossSides === 8 || c.bossDie !== null) continue; break
      case 'Destruction': case 'Corrosion':
        target = gear.find(item => (name !== 'Corrosion' || item.weapon) && cardName(item.id) !== 'Hache Clairfeuille')?.id
        if (!target) continue
        break
      case 'Dépossession': if (hasFlag(c, 'ignoreWeapons') || !gear.some(item => item.weapon)) continue; break
      case 'Brise-armure': if (hasFlag(c, 'ignoreArmors') || !gear.some(item => !item.weapon)) continue; break
      case 'Chance': if (c.bossDie === null) continue; break
      case 'Malchance': if (c.bossDie === null || c.playerDie === null || c.playerDie <= 0) continue; break
      case 'Trouvaille': case 'Providence': if (!s.lootDeck.length && !s.lootDiscard.some(id => !(c.bossPlayedCards ?? []).includes(id))) continue; break
      case 'Vœu': if (!s.lootDeck.some(id => card(id).type === 'Action' && BOSS_REACTIONS.includes(cardName(id)) && !(c.bossPlayedCards ?? []).includes(id))) continue; break
    }
    if (name.startsWith('Voie du ')) {
      const klass = name.slice('Voie du '.length) as ClassName
      if (c.bossActives?.[klass] || !planBossActive(s, c, klass, id)) continue
      target = klass
    }
    c.bossHand = c.bossHand.filter(other => other !== id)
    s.lootDiscard.push(id)
    c.bossPlayedCards = [...(c.bossPlayedCards ?? []), id]
    log(s, 'bossPlays', { card: id })
    const counters = s.hand.filter(id => cardName(id) === 'Contre-sort')
    if (counters.length) queue(s, { purpose: 'boss-counter', options: counters.map(id => ({ id, cardId: id })), optional: true, ctx: { card: id, target: target ?? '' } })
    else applyBossCard(s, c, id, target)
    return true
  }
  return activateBossPower(s, c)
}

// ---------- Combat resolution ----------

function monsterNames(c: Combat) {
  return c.monsters.map(cardName)
}

function endCombat(s: GameState, c: Combat) {
  const pest = c.monsters.find((id) => cardName(id) === 'Sème-Peste')
  if (pest && !hasFlag(c, 'pest-retry')) {
    s.forcedMonsterId = pest
    s.monsterDeck.unshift(pest)
    s.monsterDiscard.push(...c.monsters.filter((id) => id !== pest))
    log(s, 'pestWaits', { card: pest })
  } else s.monsterDiscard.push(...c.monsters)
  s.combat = null
  s.phase = 'main'
  s.endTurnPending = true
}

function postCombat(s: GameState, c: Combat, outcome: 'win' | 'lose' | 'flee' | 'tie') {
  const names = monsterNames(c)
  if (names.includes('Nécroptère') && outcome !== 'lose') {
    s.level = clampLevel(s.level - 1)
    log(s, 'sharedPlague')
  }
  if (names.includes('Venimeur') && outcome !== 'flee') queueDiscardOne(s)
  if (c.destroyAfter) {
    const options = equippedOptions(s)
    if (options.length > 0) queue(s, { purpose: 'destroy-equip', options, optional: false, ctx: {} })
  }
}

function winMonster(s: GameState, tie: boolean) {
  const c = s.combat
  if (!c) return
  const names = monsterNames(c)
  if (c.rounds > 1) {
    c.rounds -= 1
    c.playerDie = null
    log(s, 'secondAssault')
    return
  }
  completeVictoryOaths(s, c, tie)
  const rewards = combatRewards(c, tie)
  const levels = rewards.levels
  let loot = rewards.loot
  const sporule = rewards.sporule
  if (names.includes('Sans-Visage')) {
    let index = 0
    while (true) {
      const roll = playerEffectRoll(s, c)
      const extra = roll.total >= 5
      log(s, 'sansVisageRolled', { card: c.monsters.find((id) => cardName(id) === 'Sans-Visage')!, ...rollParams(roll), extra: extra ? 1 : 0, index: ++index })
      if (!extra) break
      loot += 1
    }
  }
  s.level = clampLevel(s.level + levels)
  drawLoot(s, loot)
  s.stats.monsters += 1
  log(s, 'victory', { card: c.monsters[0], levels, loot })
  const fetiche = s.equipment.hands.find((id) => cardName(id) === 'Hache Fétiche à deux mains')
  if (fetiche) queue(s, { purpose: 'weapon-loot', options: [{ id: fetiche, cardId: fetiche }], optional: true, ctx: {} })
  postCombat(s, c, tie ? 'tie' : 'win')
  const chain = names.includes('Céramid')
  const retained = c.monsters.filter((id) => cardName(id) === 'Vitrail')
  s.retainedMonsters = [...(s.retainedMonsters ?? []), ...retained]
  if (retained.length) log(s, 'merchantFavor', { card: retained[0] })
  s.monsterDiscard.push(...c.monsters.filter((id) => !retained.includes(id)))
  s.combat = null
  s.phase = 'main'
  checkMilestone(s)
  if (sporule) {
    queue(s, {
      purpose: 'sporule',
      options: [{ id: 'level-loot' }, { id: 'two-levels' }, { id: 'two-loot' }],
      optional: false,
      ctx: {},
    })
  }
  if (chain) {
    log(s, 'chain')
    const next = drawMonster(s)
    if (next) startMonsterCombat(s, next)
    else s.endTurnPending = true
  } else {
    s.endTurnPending = true
  }
}

function loseMonster(s: GameState) {
  const c = s.combat
  if (!c) return
  const names = monsterNames(c)
  s.stats.defeats += 1
  const spared = names.includes('Rapiécé') || names.includes('Orant')
  const before = s.level
  if (!spared) s.level = clampLevel(s.level - 1)
  log(s, 'defeat', { card: c.monsters[0], spared: spared ? 1 : 0, before, after: s.level })
  if (names.includes('Nécropode')) drawLoot(s, 1)
  if (names.includes('Réanimateur')) s.nextMonsterPenalty = 3
  if (names.includes('Souverain')) queueDiscardOne(s)
  if (names.includes('Arachnarque')) {
    const options = equippedOptions(s, true)
    if (options.length > 0) queue(s, { purpose: 'destroy-equip', options, optional: false, ctx: {} })
  }
  postCombat(s, c, 'lose')
  endCombat(s, c)
}

function attemptFlee(s: GameState, automatic: boolean) {
  const c = s.combat
  if (!c || c.kind !== 'monster' || hasFlag(c, 'noFlee')) return
  if (!automatic && (c.hasRolled || c.playerDie !== null)) return
  const guaranteed = automatic || s.race === 'Vesskar'
  const roll = guaranteed ? null : rollPlayerDice(s, 6, 'single', s.equipment.hands.some((id) => cardName(id) === 'Dague Lunefeuille') ? 1 : 0)
  const value = roll?.total ?? 0
  if (roll) log(s, 'fleeRolled', { card: c.monsters[0], ...rollParams(roll) })
  if (roll) {
    c.fleeRoll = roll
    if (activeClass(s) === 'Mage' && activeStatus(s).available) {
      queueFleeResult(s, c)
      return
    }
    delete c.fleeRoll
  }
  finishFlee(s, c, value, guaranteed)
}

function queueFleeResult(s: GameState, c: Combat) {
  const canReroll = activeClass(s) === 'Mage' && activeStatus(s).available
  queue(s, { purpose: 'flee-result', optional: false, options: [{ id: 'accept-flee' }, ...(canReroll ? [{ id: 'mage-flee' }] : [])], ctx: { old: c.fleeRoll!.total } })
}

function finishFlee(s: GameState, c: Combat, value: number, guaranteed = false) {
  delete c.fleeRoll
  if (guaranteed || value >= 4) {
    s.stats.flees += 1
    log(s, 'fled', { card: c.monsters[0], value, automatic: guaranteed ? 1 : 0 })
    postCombat(s, c, 'flee')
    endCombat(s, c)
  } else {
    log(s, 'fleeFailed', { card: c.monsters[0], value })
    loseMonster(s)
  }
}

function resolveCombat(s: GameState) {
  const c = s.combat
  if (!c) return
  if (c.kind === 'boss') {
    while (bossReact(s, c)) { if (!s.combat || s.promptQueue.length) return }
    if (!s.combat || s.promptQueue.length) return
    if (c.bossDie === null) rollBossDie(s, c)
    while (bossReact(s, c)) { if (!s.combat || s.promptQueue.length) return }
    if (!s.combat || s.promptQueue.length) return
  }
  const power = computePower(s)
  if (!power) return
  const diff = power.player.total - power.opponent.total
  const tie = diff === 0
  const wins = diff > 0 || (tie && !hasFlag(c, 'tieLoses'))
  log(s, 'resolved', { card: c.bossId ?? c.monsters[0], player: power.player.total, opponent: power.opponent.total })

  if (c.kind === 'boss') {
    s.finalCombat = { outcome: wins ? 'won' : 'lost', combat: structuredClone(c), power, level: s.level, equipment: structuredClone(s.equipment), completedOaths: [...(s.completedOaths ?? [])] }
    if (wins) {
      completeVictoryOaths(s, c, tie)
      s.phase = 'won'
      s.victoryBoss = c.bossId
      s.combat = null
      log(s, 'bossDefeated', { card: c.bossId ?? '' })
    } else {
      s.phase = 'lost'
      s.combat = null
      log(s, 'bossLost', { card: c.bossId ?? '' })
    }
    return
  }
  if (tie && monsterNames(c).includes('Tressefer')) {
    log(s, 'honorDuel')
    postCombat(s, c, 'tie')
    endCombat(s, c)
    return
  }
  if (wins) winMonster(s, tie)
  else loseMonster(s)
}

// ---------- Actions (cards) ----------

export function canPlayAction(s: GameState, id: string) {
  if (!canManageHand(s) || (s.phase !== 'main' && s.phase !== 'combat')) return false
  if (!s.hand.includes(id)) return false
  const entry = card(id)
  if (entry.type !== 'Action') return false
  const name = entry.name
  const c = s.combat
  if (COMBAT_ONLY_ACTIONS.has(name) && !c) return false
  if (c) {
    if (hasFlag(c, 'noActions')) return false
    if ((name === 'Chance' || name === 'Force') && hasFlag(c, 'noChanceForce')) return false
  }
  const boss = c?.kind === 'boss'
  const monster = c?.kind === 'monster'
  switch (name) {
    case 'Contre-sort': return false // Offered as a response when the Boss plays an Action.
    case 'Chance':
      return c?.playerDie !== null && c !== null
    case 'Malchance':
      return boss && c.bossDie !== null
    case 'Faiblesse':
      return Boolean(c) && !hasFlag(c as Combat, 'golem')
    case 'Frénésie':
    case 'Apaiser':
      return monster && !hasFlag(c, 'golem')
    case 'Dépossession':
      return boss && c.bossEquip.some((equipId) => card(equipId).type === 'Arme') && !hasFlag(c, 'bossIgnoreWeapons')
    case 'Brise-armure':
      return boss && c.bossEquip.some((equipId) => card(equipId).type === 'Armure') && !hasFlag(c, 'bossIgnoreArmors')
    case 'Destruction':
      return boss && c.bossEquip.some((equipId) => cardName(equipId) !== 'Hache Clairfeuille')
    case 'Corrosion':
      return boss && c.bossEquip.some((equipId) => card(equipId).type === 'Arme' && cardName(equipId) !== 'Hache Clairfeuille')
    case 'Cupidité':
    case 'Exécution':
      return monster
    case 'Peur':
      return monster && !hasFlag(c, 'noFlee')
    case 'Invocation':
      return monster && s.monsterDeck.length + s.monsterDiscard.length > 0
    case 'Éveil':
      return s.dieSides === 6 && s.level >= 5
    case 'Vœu':
      return s.lootDeck.some((deckId) => card(deckId).type === 'Action')
    case 'Mimétisme':
    case 'Renoncement':
    case 'Trouvaille':
    case 'Providence':
    case 'Force':
      return true
    default:
      return name.startsWith('Voie du ')
  }
}

function playAction(s: GameState, id: string) {
  if (!canPlayAction(s, id)) return
  const name = cardName(id)
  const c = s.combat
  discardFromHand(s, id)
  log(s, 'actionPlayed', { card: id })

  let cancelled = false
  if (c) {
    if (hasFlag(c, 'suzeraine-cancel') && !hasFlag(c, 'suzeraine-consumed') && name !== 'Éveil') {
      cancelled = true
      addFlag(c, 'suzeraine-consumed')
    }
    if (hasFlag(c, 'cuirasse') && !hasFlag(c, 'cuirasse-blocked') && ['Faiblesse', 'Frénésie', 'Apaiser', 'Exécution', 'Invocation'].includes(name)) {
      cancelled = true
      addFlag(c, 'cuirasse-blocked')
    }
    if (hasFlag(c, 'molosse') && c.actionsPlayed === 0) {
      c.monsterBonus += 2
      log(s, 'molosse')
    }
    c.actionsPlayed += 1
  }
  if (!cancelled && c?.kind === 'boss' && name !== 'Renoncement') {
    const counter = c.bossHand.find(id => cardName(id) === 'Contre-sort')
    if (counter) {
      c.bossHand = c.bossHand.filter(id => id !== counter)
      s.lootDiscard.push(counter)
      c.bossPlayedCards = [...(c.bossPlayedCards ?? []), counter]
      log(s, 'bossPlays', { card: counter })
      cancelled = true
    }
  }
  if (cancelled) {
    log(s, 'actionCancelled')
    return
  }
  if (c?.kind === 'boss') c.bossReady = false
  if (c) c.resolvedActions = (c.resolvedActions ?? 0) + 1

  switch (name) {
    case 'Force':
      if (c) c.playerBonus += 2
      break
    case 'Chance':
      if (c && c.playerDie !== null) { c.playerDie += 2; c.playerDieModifier = 2 }
      break
    case 'Malchance':
      if (c && c.bossDie !== null) { c.bossDie = Math.max(0, c.bossDie - 2); c.bossDieModifier = -2 }
      break
    case 'Faiblesse':
      if (c) c.monsterBonus -= 2
      break
    case 'Frénésie':
      if (c) c.monsterBonus += 2
      break
    case 'Apaiser':
      if (c) c.monsterBonus -= 2
      break
    case 'Dépossession':
      if (c) addFlag(c, 'bossIgnoreWeapons')
      break
    case 'Brise-armure':
      if (c) addFlag(c, 'bossIgnoreArmors')
      break
    case 'Corrosion':
    case 'Destruction':
      if (c) {
        const targets = c.bossEquip
          .filter((equipId) => cardName(equipId) !== 'Hache Clairfeuille' && (name === 'Destruction' || card(equipId).type === 'Arme'))
          .sort((a, b) => printedPower(b) - printedPower(a))
        if (targets.length) queue(s, { purpose: 'boss-destroy', options: targets.map((id) => ({ id, cardId: id })), optional: false, ctx: {} })
      }
      break
    case 'Cupidité': {
      const roll = playerEffectRoll(s, c)
      const value = roll.total
      log(s, 'greedRoll', { card: id, ...rollParams(roll) })
      if (c && value >= 4) c.lootMultiplier *= 2
      break
    }
    case 'Exécution': {
      const roll = playerEffectRoll(s, c)
      const value = roll.total
      log(s, 'executionRoll', { card: id, ...rollParams(roll) })
      if (value >= 6 && c) { c.rounds = 1; winMonster(s, false) }
      break
    }
    case 'Peur':
      attemptFlee(s, true)
      break
    case 'Invocation': {
      const next = drawMonster(s)
      if (c && next) {
        c.monsters.push(next)
        log(s, 'summoned', { card: next })
        applyMonsterStart(s, c, next)
      }
      break
    }
    case 'Éveil':
      s.dieSides = 8
      replaceRefusedAwakeningOath(s)
      log(s, 'awakened')
      break
    case 'Trouvaille':
      drawLoot(s, 2)
      break
    case 'Providence':
      drawLoot(s, 3)
      break
    case 'Renoncement':
      s.lootDiscard.push(...s.hand)
      s.hand = []
      s.level = clampLevel(s.level + 1)
      checkMilestone(s)
      break
    case 'Vœu': {
      const names = new Set<string>()
      const options = s.lootDeck
        .filter((deckId) => card(deckId).type === 'Action' && !names.has(cardName(deckId)) && names.add(cardName(deckId)))
        .map((deckId) => ({ id: deckId, cardId: deckId }))
      queue(s, { purpose: 'vow', options, optional: false, ctx: {} })
      break
    }
    case 'Mimétisme':
      queue(s, {
        purpose: 'mimic',
        options: (['Guerrier', 'Druide', 'Chasseur', 'Mage', 'Voleur', 'Nécromancien'] as const).filter((klass) => klass !== activeClass(s)).map((id) => ({ id })),
        optional: false,
        ctx: {},
      })
      break
    default:
      if (name.startsWith('Voie du ')) {
        const target = name.replace('Voie du ', '')
        s.mimic = target as ClassName
        log(s, 'mimic', { klass: target })
      }
  }
}

// ---------- Class Actives ----------

export type ActiveBlockReason = { code: 'ended' | 'choice' | 'combat-only' | 'outside-combat' | 'monster-block' | 'used-combat' | 'used-turn' | 'weapon-cost' | 'armor-cost' | 'armor-equipped' | 'roll-first' | 'cards-cost' | 'monster-discard-empty' | 'monster-deck-empty' | 'equipment-match'; required?: number; current?: number }
export type ActiveStatus = { klass: ClassName; available: boolean; reasons: ActiveBlockReason[] }

export function activeStatus(s: GameState): ActiveStatus {
  const klass = activeClass(s)
  const c = s.combat
  const reasons: ActiveBlockReason[] = []
  if (s.phase !== 'main' && s.phase !== 'combat') reasons.push({ code: 'ended' })
  if (s.promptQueue.length > 0) reasons.push({ code: 'choice' })
  const outside = klass === 'Chasseur' || klass === 'Voleur'
  if (outside) {
    if (c && !(klass === 'Voleur' && c.kind === 'boss')) reasons.push({ code: 'outside-combat' })
    if (klass === 'Voleur' && c?.kind === 'boss' && !thiefBossOptions(s, c).length) reasons.push({ code: 'equipment-match' })
    if (s.turnFlags.includes(klass === 'Chasseur' ? 'hunter' : 'thief')) reasons.push({ code: 'used-turn' })
  } else {
    if (!c) reasons.push({ code: 'combat-only' })
    if (c && hasFlag(c, 'noActive')) reasons.push({ code: 'monster-block' })
    if (klass === 'Nécromancien' && c?.used.includes(klass)) reasons.push({ code: 'used-combat' })
  }
  switch (klass) {
    case 'Guerrier': if (!s.hand.some((id) => card(id).type === 'Arme')) reasons.push({ code: 'weapon-cost' }); break
    case 'Druide':
      if (!s.hand.some((id) => card(id).type === 'Armure')) reasons.push({ code: 'armor-cost' })
      if (!equippedOptions(s, true).some((option) => !c?.doubledArmors.includes(option.id))) reasons.push({ code: 'armor-equipped' })
      break
    case 'Mage': if (c && !mageRollTargets(c).length) reasons.push({ code: 'roll-first' }); break
    case 'Nécromancien': if (!s.monsterDiscard.length) reasons.push({ code: 'monster-discard-empty' }); break
    case 'Chasseur': if (!s.monsterDeck.length && s.level < BOSS_LEVEL) reasons.push({ code: 'monster-deck-empty' }); break
  }
  const required = klass === 'Nécromancien' ? 3 : klass === 'Voleur' ? (artifactBoosts(s, 'Voleur') ? 1 : 2) : klass === 'Mage' || klass === 'Chasseur' ? 1 : 0
  if (s.hand.length < required) reasons.push({ code: 'cards-cost', required, current: s.hand.length })
  return { klass, available: reasons.length === 0, reasons }
}

function startPay(s: GameState, kind: string, n: number, filter: 'any' | 'armor' = 'any') {
  const options = handOptions(s, filter === 'armor' ? (id) => card(id).type === 'Armure' : undefined)
  queue(s, { purpose: 'pay', options, optional: true, ctx: { kind, n, filter, paid: [] } })
}

function activateClassActive(s: GameState) {
  const status = activeStatus(s)
  if (!status.available) return
  switch (status.klass) {
    case 'Guerrier':
      queue(s, {
        purpose: 'warrior-pick',
        options: handOptions(s, (id) => card(id).type === 'Arme'),
        optional: true,
        ctx: {},
      })
      break
    case 'Druide':
      startPay(s, 'druid', 1, 'armor')
      break
    case 'Mage':
      startPay(s, 'mage', 1)
      break
    case 'Nécromancien':
      startPay(s, 'necro', 3)
      break
    case 'Chasseur':
      if (s.level >= BOSS_LEVEL) queue(s, { purpose: 'hunter-target', options: [...(s.monsterDeck.length ? [{ id: 'hunt-monster' }] : []), { id: 'hunt-boss' }], optional: true, ctx: {} })
      else startPay(s, 'hunter', 1)
      break
    case 'Voleur':
      startPay(s, 'thief', artifactBoosts(s, 'Voleur') ? 1 : 2)
      break
  }
}

function mageRollTargets(c: Combat): PromptOption[] {
  if (c.fleeRoll) return [{ id: 'mage-player' }]
  return [...(c.playerDie !== null ? [{ id: 'mage-player' }] : []), ...(c.bossDie !== null ? [{ id: 'mage-boss' }] : []), ...Object.keys(c.monsterRolls ?? {}).map(id => ({ id: `mage-roll:${id}`, cardId: id }))]
}

function matchingThiefGear(s: GameState, target: string) {
  return equippedIds(s).filter(id => ['Arme', 'Armure'].includes(card(id).type) && card(id).type === card(target).type && card(id).subtype === card(target).subtype)
}

function thiefBossOptions(s: GameState, c: Combat): PromptOption[] {
  return c.bossEquip.filter(id => matchingThiefGear(s, id).length).map(id => ({ id, cardId: id }))
}

function rerollMageTarget(s: GameState, c: Combat, target: string) {
  if (target === 'mage-boss' && c.bossDie !== null) {
    const old = c.bossDie
    const roll = diceRoll(s, c.bossSides)
    c.bossRoll = roll
    c.bossDie = Math.max(0, roll.total + (c.bossDieModifier ?? 0))
    c.bossReady = false
    log(s, 'mageOpponentReroll', { card: c.bossId!, ...rollParams(roll), old, fresh: c.bossDie })
    return
  }
  if (target.startsWith('mage-roll:')) {
    const id = target.slice('mage-roll:'.length)
    const old = c.monsterRolls?.[id]
    if (!old) return
    const roll = diceRoll(s, old.sides, old.mode === 'sum' ? old.bonus / old.raw.length : old.bonus, old.mode)
    const effect = (value: number) => cardName(id) === 'Lacéreur' ? value : cardName(id) === 'Tranchebec' ? value >= 4 ? 2 : 0 : value <= 2 ? -2 : value >= 5 ? 2 : 0
    const change = effect(roll.total) - effect(old.total)
    c.monsterBonus += change
    c.monsterRolls![id] = roll
    log(s, 'mageOpponentReroll', { card: id, ...rollParams(roll), old: old.total, fresh: roll.total, powerChange: change })
    return
  }
  finishPay(s, 'mage-player')
}

function finishPay(s: GameState, kind: string) {
  const c = s.combat
  switch (kind) {
    case 'druid': {
      if (!c) break
      const count = artifactBoosts(s, 'Druide') ? 2 : 1
      const armors = equippedOptions(s, true).filter((option) => !c.doubledArmors.includes(option.id))
      queue(s, { purpose: 'druid-pick', options: armors, optional: false, ctx: { remaining: count } }, true)
      break
    }
    case 'mage': {
      if (!c) break
      const targets = mageRollTargets(c)
      if (targets.length > 1) queue(s, { purpose: 'mage-target', options: targets, optional: false, ctx: {} }, true)
      else if (targets[0]) rerollMageTarget(s, c, targets[0].id)
      break
    }
    case 'mage-player': {
      if (c?.fleeRoll) {
        const old = c.fleeRoll
        const fresh = rollPlayerDice(s, 6, 'single', s.equipment.hands.some(id => cardName(id) === 'Dague Lunefeuille') ? 1 : 0)
        c.fleeRoll = fresh
        log(s, 'mageReroll', { ...rollParams(fresh) })
        queue(s, { purpose: 'mage-keep', optional: false, options: [{ id: 'keep-old' }, { id: 'keep-new' }], ctx: { flee: 1, old: old.total, fresh: fresh.total, oldRaw: old.raw.join(','), oldSides: old.sides, oldBonus: old.bonus, oldTotal: old.total, oldMode: old.mode } }, true)
        break
      }
      if (!c || c.playerDie === null) break
      c.used.push('Mage')
      const old = c.playerDie
      const oldRoll = c.playerRoll
      const oldModifier = c.playerDieModifier ?? 0
      const fresh = combatRoll(s, c)
      log(s, 'mageReroll', { ...rollParams(c.playerRoll!) })
      if (artifactBoosts(s, 'Mage') && !s.turnFlags.includes('mage-artifact')) {
        s.turnFlags.push('mage-artifact')
        c.playerDie = old + fresh
        c.playerDieModifier = (c.playerRoll?.bonus ?? 0) + c.playerDie - fresh
      } else {
        queue(
          s,
          { purpose: 'mage-keep', options: [{ id: 'keep-old' }, { id: 'keep-new' }], optional: false, ctx: { old, fresh, oldModifier, oldRaw: oldRoll?.raw.join(',') ?? '', oldSides: oldRoll?.sides ?? s.dieSides, oldBonus: oldRoll?.bonus ?? 0, oldTotal: oldRoll?.total ?? old, oldMode: oldRoll?.mode ?? 'single' } },
          true,
        )
      }
      break
    }
    case 'necro': {
      if (!c) break
      c.used.push('Nécromancien')
      const count = artifactBoosts(s, 'Nécromancien') ? 5 : 3
      const choices = s.monsterDiscard.slice(-count).reverse()
      queue(s, { purpose: 'necro-pick', options: choices.map((id) => ({ id, cardId: id })), optional: false, ctx: {} }, true)
      break
    }
    case 'hunter': {
      s.turnFlags.push('hunter')
      const count = artifactBoosts(s, 'Chasseur') ? 5 : 3
      const choices = s.monsterDeck.splice(0, count)
      queue(s, { purpose: 'hunter-pick', options: choices.map((id) => ({ id, cardId: id })), optional: false, ctx: { choices } }, true)
      break
    }
    case 'hunter-boss': {
      s.turnFlags.push('hunter')
      const choices = shuffle(s, BOSS_IDS).slice(0, artifactBoosts(s, 'Chasseur') ? 5 : 3)
      queue(s, { purpose: 'hunter-boss-pick', options: choices.map((id) => ({ id, cardId: id })), optional: false, ctx: {} }, true)
      break
    }
    case 'thief': {
      s.turnFlags.push('thief')
      if (c?.kind === 'boss') {
        queue(s, { purpose: 'thief-boss-pick', options: thiefBossOptions(s, c), optional: false, ctx: {} }, true)
        break
      }
      const choices: string[] = []
      for (let index = 0; index < 5; index += 1) {
        const id = drawFromLoot(s)
        if (id) choices.push(id)
      }
      queue(s, { purpose: 'thief-pick', options: choices.map((id) => ({ id, cardId: id })), optional: false, ctx: { choices } }, true)
      break
    }
  }
}

// ---------- Prompts ----------

function answerPrompt(s: GameState, option: string | null) {
  const prompt = s.promptQueue[0]
  if (!prompt) return
  if (prompt.purpose === 'tavern' && option !== null && s.hand.length === 0) return
  if (option === null) {
    if (!prompt.optional) return
  } else if (!prompt.options.some((entry) => entry.id === option)) {
    return
  }
  s.promptQueue.shift()
  const c = s.combat
  const choices = Array.isArray(prompt.ctx.choices) ? (prompt.ctx.choices as string[]) : []

  switch (prompt.purpose) {
    case 'suzeraine':
      if (c && option === 'boss-bonus') { c.bossBonus += 2; log(s, 'bossDecree', { card: c.bossId ?? '' }) }
      else if (c && option === 'cancel-action') { addFlag(c, 'suzeraine-cancel'); log(s, 'bossDecreeCancel', { card: c.bossId ?? '' }) }
      break
    case 'boss-destroy':
      if (option && c && c.bossEquip.includes(option)) {
        c.bossEquip = c.bossEquip.filter((id) => id !== option)
        s.lootDiscard.push(option)
        log(s, 'bossItemDestroyed', { card: option })
        if (cardName(option) === 'Masse du Bastion') {
          const drawn = drawFromLoot(s)
          if (drawn) c.bossHand.push(drawn)
          log(s, 'bossSalvage', { card: option })
        }
      }
      break
    case 'ignore-equipment':
      if (option && c) {
        c.ignoredEquipment = [...(c.ignoredEquipment ?? []), option]
        log(s, 'equipmentIgnored', { card: option })
        const remaining = Number(prompt.ctx.remaining) - 1
        const options = prompt.options.filter((entry) => entry.id !== option)
        if (remaining > 0 && options.length) queue(s, { purpose: 'ignore-equipment', options, optional: false, ctx: { remaining } }, true)
      }
      break
    case 'hunter-target':
      if (option) startPay(s, option === 'hunt-boss' ? 'hunter-boss' : 'hunter', 1)
      break
    case 'hunter-boss-pick':
      if (option) startBoss(s, option)
      break
    case 'weapon-loot':
      if (option) { destroyEquipped(s, option, true); drawLoot(s, 2); log(s, 'weaponHarvest', { card: option }) }
      break
    case 'druid-pick':
      if (option && c && !c.doubledArmors.includes(option)) {
        c.doubledArmors.push(option)
        if (!c.used.includes('Druide')) c.used.push('Druide')
        log(s, 'armorDoubled', { card: option })
        const remaining = Number(prompt.ctx.remaining) - 1
        const options = equippedOptions(s, true).filter((entry) => !c.doubledArmors.includes(entry.id))
        if (remaining > 0 && options.length) queue(s, { purpose: 'druid-pick', options, optional: false, ctx: { remaining } }, true)
      }
      break
    case 'oath-armor-slot':
      if (option && ARMOR_SLOTS.includes(option as (typeof ARMOR_SLOTS)[number])) s.equipment.extraArmor = { slot: option, id: null }
      break
    case 'oath-boss-action':
      if (option) {
        const index = s.lootDiscard.lastIndexOf(option)
        if (index >= 0) { s.lootDiscard.splice(index, 1); s.hand.push(option); log(s, 'oathActionGained', { card: option }) }
      }
      break
    case 'boss-counter':
      if (c && typeof prompt.ctx.card === 'string') {
        if (option) { discardFromHand(s, option); log(s, 'playerCounter', { card: option }) }
        else applyBossCard(s, c, prompt.ctx.card, String(prompt.ctx.target ?? '') || undefined)
      }
      break
    case 'discard-excess':
      if (option && discardFromHand(s, option)) {
        s.excessDiscarded = (s.excessDiscarded ?? 0) + 1
        if (s.excessDiscarded >= 2) completeOath(s, OATH.burden)
      }
      break
    case 'discard-one':
      if (option) discardFromHand(s, option)
      break
    case 'destroy-equip':
      if (option) destroyEquipped(s, option)
      break
    case 'tribute-loot':
      if (option === 'decline') {
        if (c) c.forgoLoot = true
      } else if (option) {
        discardFromHand(s, option)
      }
      break
    case 'tribute-power':
      if (option === 'decline') {
        if (c) c.playerBonus -= 3
      } else if (option) {
        discardFromHand(s, option)
      }
      break
    case 'creator':
      if (option && c) {
        discardFromHand(s, option)
        c.monsterBonus -= 3
      }
      break
    case 'fournaise':
      if (option) {
        const others = choices.filter((id) => id !== option)
        s.monsterDeck = [...s.monsterDeck, ...shuffle(s, others)]
        if (prompt.ctx.summoned && c) {
          c.monsters.push(option)
          if (cardName(option) !== 'Fournaise') applyMonsterStart(s, c, option)
        } else startMonsterCombat(s, option, true)
      }
      break
    case 'sporule':
      if (option === 'level-loot') {
        s.level = clampLevel(s.level + 1)
        drawLoot(s, 1)
      } else if (option === 'two-levels') {
        s.level = clampLevel(s.level + 2)
      } else {
        drawLoot(s, 2)
      }
      checkMilestone(s)
      break
    case 'fielpeau':
      if (c) {
        if (option === 'reroll') {
          c.playerDie = combatRoll(s, c)
          log(s, 'rerolled', { ...rollParams(c.playerRoll!) })
        } else if (option) {
          discardFromHand(s, option)
        }
      }
      break
    case 'fumefange':
      if (option === 'flee') attemptFlee(s, false)
      else if (option) destroyEquipped(s, option)
      break
    case 'aiguemorte':
      if (c) {
        if (option === 'ignore-armors') addFlag(c, 'ignoreArmors')
        else c.destroyAfter = true
      }
      break
    case 'pay': {
      if (option === null) {
        if (c?.fleeRoll && prompt.ctx.kind === 'mage') queueFleeResult(s, c)
        break
      }
      const paid = [...(prompt.ctx.paid as string[]), option]
      const n = prompt.ctx.n as number
      if (paid.length < n) {
        queue(
          s,
          {
            ...prompt,
            options: prompt.options.filter((entry) => entry.id !== option),
            ctx: { ...prompt.ctx, paid },
          },
          true,
        )
      } else {
        for (const id of paid) discardFromHand(s, id)
        finishPay(s, prompt.ctx.kind as string)
      }
      break
    }
    case 'hunter-pick':
      if (option) {
        const others = choices.filter((id) => id !== option)
        s.monsterDeck = shuffle(s, [...s.monsterDeck, ...others])
        log(s, 'hunterPick', { card: option })
        startMonsterCombat(s, option)
      }
      break
    case 'thief-pick':
      if (option) {
        s.hand.push(option)
        s.lootDeck = shuffle(s, [...s.lootDeck, ...choices.filter((id) => id !== option)])
        log(s, 'thiefPick', { card: option })
      }
      break
    case 'thief-boss-pick':
      if (c?.kind === 'boss' && option && c.bossEquip.includes(option)) queue(s, { purpose: 'thief-hero-pick', options: matchingThiefGear(s, option).map(id => ({ id, cardId: id })), optional: false, ctx: { target: option } }, true)
      break
    case 'thief-hero-pick':
      if (c?.kind === 'boss' && option) {
        const taken = String(prompt.ctx.target)
        if (!c.bossEquip.includes(taken) || !matchingThiefGear(s, taken).includes(option)) break
        const before = computePower(s)!
        c.bossEquip = c.bossEquip.map(id => id === taken ? option : id)
        for (const slot of ARMOR_SLOTS) if (s.equipment.armors[slot] === option) s.equipment.armors[slot] = taken
        if (s.equipment.extraArmor?.id === option) s.equipment.extraArmor.id = taken
        setWeaponSlots(s.equipment, weaponSlots(s.equipment).map(id => id === option ? taken : id) as [string | null, string | null])
        c.bossReady = false
        const after = computePower(s)!
        log(s, 'thiefSwap', { card: taken, give: option, powerChange: after.player.total - before.player.total, bossPowerChange: after.opponent.total - before.opponent.total })
      }
      break
    case 'necro-pick':
      if (option && c) {
        const bonus = Math.floor(printedPower(option) / 2)
        c.playerBonus += bonus
        log(s, 'necroBonus', { card: option, bonus })
      }
      break
    case 'warrior-pick':
      if (option && c) {
        discardFromHand(s, option)
        const bonus = printedPower(option) + (artifactBoosts(s, 'Guerrier') ? 1 : 0)
        c.playerBonus += bonus
        c.used.push('Guerrier')
        log(s, 'warriorThrow', { card: option, bonus })
      }
      break
    case 'mage-keep':
      if (c) {
        if (prompt.ctx.flee && c.fleeRoll) {
          if (option === 'keep-old') c.fleeRoll = { raw: String(prompt.ctx.oldRaw).split(',').map(Number), sides: Number(prompt.ctx.oldSides), bonus: Number(prompt.ctx.oldBonus), total: Number(prompt.ctx.oldTotal), mode: prompt.ctx.oldMode as DiceRoll['mode'] }
          queueFleeResult(s, c)
          break
        }
        c.playerDie = option === 'keep-new' ? (prompt.ctx.fresh as number) : (prompt.ctx.old as number)
        if (option === 'keep-old' && typeof prompt.ctx.oldRaw === 'string') {
          c.playerRoll = prompt.ctx.oldRaw ? { raw: prompt.ctx.oldRaw.split(',').map(Number), sides: Number(prompt.ctx.oldSides), bonus: Number(prompt.ctx.oldBonus), total: Number(prompt.ctx.oldTotal), mode: prompt.ctx.oldMode as DiceRoll['mode'] } : undefined
          c.playerDieModifier = Number(prompt.ctx.oldModifier)
        }
      }
      break
    case 'mage-target':
      if (c && option) rerollMageTarget(s, c, option)
      break
    case 'flee-result':
      if (c?.fleeRoll) {
        if (option === 'mage-flee' && activeStatus(s).available) activateClassActive(s)
        else finishFlee(s, c, c.fleeRoll.total)
      }
      break
    case 'vow':
      if (option) {
        s.lootDeck.splice(s.lootDeck.indexOf(option), 1)
        s.hand.push(option)
        s.lootDeck = shuffle(s, s.lootDeck)
        log(s, 'vow', { card: option })
      }
      break
    case 'mimic':
      if (option) {
        s.mimic = option as ClassName
        log(s, 'mimic', { klass: option })
      }
      break
    case 'oath':
      if (option) {
        s.oaths = [...(s.oaths ?? []), option]
        log(s, 'oathKept', { card: option })
        const keep = Number(prompt.ctx.keep ?? 1) - 1
        const rest = choices.filter((id) => id !== option)
        if (keep > 0 && rest.length > 0) {
          queue(s, {
            purpose: 'oath',
            options: rest.map((id) => ({ id, cardId: id })),
            optional: false,
            ctx: { choices: rest, keep },
          })
        }
      }
      break
    case 'tavern':
      if (!option) {
        s.lootDiscard.push(...choices)
        s.monsterDiscard.push(...(s.retainedMonsters ?? []))
        s.retainedMonsters = []
        log(s, 'tavernSkip')
        break
      }
      {
        const give = handOptions(s)
        queue(
          s,
          { purpose: 'tavern-give', options: [...give, { id: 'tavern-back' }], optional: false, ctx: { taken: option, choices, remaining: Number(prompt.ctx.remaining ?? 1) } },
          true,
        )
      }
      break
    case 'tavern-give':
      if (option === 'tavern-back') {
        queue(s, { purpose: 'tavern', options: choices.map((id) => ({ id, cardId: id })), optional: true, ctx: { choices, remaining: Number(prompt.ctx.remaining ?? 1) } }, true)
        break
      }
      if (option) {
        discardFromHand(s, option)
        if (choices.length > 0) {
          s.hand.push(prompt.ctx.taken as string)
          const rest = choices.filter((id) => id !== prompt.ctx.taken)
          const remaining = Number(prompt.ctx.remaining ?? 1) - 1
          if (remaining > 0 && rest.length) queue(s, { purpose: 'tavern', options: rest.map((id) => ({ id, cardId: id })), optional: true, ctx: { choices: rest, remaining } }, true)
          else {
            s.lootDiscard.push(...rest)
            s.monsterDiscard.push(...(s.retainedMonsters ?? []))
            s.retainedMonsters = []
          }
        }
        log(s, 'tavernSwap', { card: prompt.ctx.taken as string, give: option })
      }
      break
    case 'envers':
      if (c) {
        if (option === 'decline') {
          c.stolenArmor = prompt.ctx.armor as string
          c.bossBonus += Number(prompt.ctx.armorPower ?? equipmentCardPower(s, prompt.ctx.armor as string, c))
          log(s, 'enversSteals', { card: prompt.ctx.armor as string })
        } else if (option) {
          discardFromHand(s, option)
          log(s, 'enversResisted')
        }
      }
      break
  }
}

// ---------- Turn flow ----------

function endTurnNow(s: GameState) {
  const limit = handLimit(s)
  if (s.hand.length > limit) {
    queue(s, { purpose: 'discard-excess', options: handOptions(s), optional: false, ctx: { count: s.hand.length - limit } })
    return
  }
  if (!s.tavernDone) {

    s.tavernDone = true
    // The Tavern is a trade: with an empty hand there is nothing to swap, so it stays closed.
    if (s.hand.length > 0) {
      const choices: string[] = []
      for (let index = 0; index < TAVERN_SIZE; index += 1) {
        const id = drawFromLoot(s)
        if (id) choices.push(id)
      }
      if (choices.length > 0) {
        log(s, 'tavernOpen')
        queue(s, {
          purpose: 'tavern',
          options: choices.map((id) => ({ id, cardId: id })),
          optional: true,
          ctx: { choices, remaining: (s.retainedMonsters ?? []).length ? 2 : 1 },
        })
        return
      }
    }
  }
  s.tavernDone = false
  s.endTurnPending = false
  s.endTurnRequested = false
  s.turn += 1
  s.mimic = null
  s.turnFlags = []
  s.excessDiscarded = 0
  if (s.level >= BOSS_LEVEL) {
    // Only the level-up turn grants grace; the next completed turn adds enrage.
    // Existing saves with pressure already accumulated keep their active enrage.
    if (s.bossEnrageArmed || s.bossPressure > 0) {
      s.bossPressure += 1
      log(s, 'bossGrows', { count: s.bossPressure })
    }
    s.bossEnrageArmed = true
  }
  log(s, 'newTurn', { turn: s.turn })
  if (s.forcedMonsterId) {
    const id = s.forcedMonsterId
    s.forcedMonsterId = null
    const index = s.monsterDeck.indexOf(id)
    if (index >= 0) s.monsterDeck.splice(index, 1)
    // A pending rematch belongs to the previous encounter, not to a new draw.
    const retiredIndex = s.removedMonsters?.indexOf(id) ?? -1
    if (retiredIndex >= 0) s.removedMonsters!.splice(retiredIndex, 1)
    startMonsterCombat(s, id)
    if (s.combat) addFlag(s.combat, 'pest-retry')
    s.draws.push({ id, kind: 'monster' })
  }
}

function settle(s: GameState) {
  if (s.promptQueue.length > 0) return
  if (s.endTurnPending && s.endTurnRequested && !s.combat && s.phase === 'main') endTurnNow(s)
}

export function reduce(state: GameState, action: GameAction): GameState {
  if (state.phase === 'won' || state.phase === 'lost') return state
  const s = structuredClone(state)
  s.draws = []
  const result = apply(s, action)
  result.promptQueue = result.promptQueue.filter(prompt => prompt.purpose !== 'discard-excess' || result.hand.length > handLimit(result))
  for (const prompt of result.promptQueue) {
    if (prompt.purpose === 'tavern-give') prompt.options = [...handOptions(result), { id: 'tavern-back' }]
    if (prompt.purpose === 'discard-excess') {
      prompt.options = handOptions(result)
      prompt.ctx.count = result.hand.length - handLimit(result)
    }
  }
  if (result.draws.length > 0) result.drawSeq += 1
  return result
}

function apply(s: GameState, action: GameAction): GameState {
  if (action.t === 'answer') {
    answerPrompt(s, action.option)
    settle(s)
    return s
  }
  // Managing the hand reopens preparation; only an explicit end-turn request
  // may advance it, including after actions played while visiting the Tavern.
  if (!s.combat && canManageHand(s) && (
    (action.t === 'playAction' && canPlayAction(s, action.id)) ||
    (action.t === 'equip' && canEquip(s, action.id)) ||
    (action.t === 'unequip' && canChangeEquipment(s))
  )) s.endTurnRequested = false
  if (s.promptQueue.length > 0) {
    if (!canManageHand(s) || !['equip', 'unequip', 'playAction'].includes(action.t)) return s
    const tavern = s.promptQueue.splice(0)
    const requested = s.endTurnRequested
    s.endTurnRequested = false
    const result = apply(s, action)
    result.endTurnRequested = requested
    result.promptQueue.push(...tavern)
    return result
  }

  const main = s.phase === 'main' && !s.combat && !s.endTurnPending
  switch (action.t) {
    case 'endTurn':
      if (s.phase === 'main' && !s.combat && s.endTurnPending) s.endTurnRequested = true
      break
    case 'equip':
      if (canEquip(s, action.id)) equip(s, action.id, action.hand)
      break
    case 'unequip':
      if (canChangeEquipment(s)) unequip(s, action.id)
      break
    case 'fightMonster':
      if (main) {
        const id = drawMonster(s)
        if (id) startMonsterCombat(s, id)
      }
      break
    case 'drawLoot':
      if (main) {
        const count = s.race === 'Nain' ? 2 : 1
        drawLoot(s, count)
        log(s, 'drewLoot', { count })
        s.endTurnPending = true
      }
      break
    case 'challengeBoss':
      if (main && s.level >= BOSS_LEVEL && BOSS_IDS.includes(action.bossId)) startBoss(s, action.bossId)
      break
    case 'drawBoss':
      if (main && s.level >= BOSS_LEVEL && BOSS_IDS.length > 0) startBoss(s, BOSS_IDS[randomInt(s, BOSS_IDS.length) - 1])
      break
    case 'playAction':
      playAction(s, action.id)
      break
    case 'useActive':
      activateClassActive(s)
      break
    case 'roll': {
      const c = s.combat
      if (c && c.playerDie === null) {
        c.playerDie = combatRoll(s, c)
        log(s, 'rolled', { ...rollParams(c.playerRoll!) })
        if (c.kind === 'boss') c.bossReady = false
        if (hasFlag(c, 'fielpeau') && !c.fielpeauDone) {
          c.fielpeauDone = true
          queue(s, { purpose: 'fielpeau', options: [...handOptions(s), { id: 'reroll' }], optional: false, ctx: {} })
        }
      }
      break
    }
    case 'oathReroll': {
      const c = s.combat
      if (c && c.playerDie === 1 && !c.oathRerollUsed && oathCompleted(s, OATH.misfortune)) {
        c.oathRerollUsed = true
        c.playerDie = combatRoll(s, c)
        log(s, 'oathRerolled', { ...rollParams(c.playerRoll!) })
      }
      break
    }
    case 'weaponReroll': {
      const c = s.combat
      if (c && canWeaponReroll(s, action.id)) {
        destroyEquipped(s, action.id, true)
        c.playerDie = combatRoll(s, c)
        log(s, 'weaponRerolled', { card: action.id, ...rollParams(c.playerRoll!) })
      }
      break
    }
    case 'resolve':
      resolveCombat(s)
      break
    case 'bossStep': {
      const c = s.combat
      if (c && c.kind === 'boss') {
        if (c.bossReady) resolveCombat(s)
        else if (!bossReact(s, c)) {
          if (c.bossDie === null) rollBossDie(s, c)
          else c.bossReady = true
        }
      }
      break
    }
    case 'flee':
      attemptFlee(s, false)
      break
  }
  settle(s)
  return s
}

export function fleeBlocked(s: GameState) {
  const c = s.combat
  return !c || c.kind !== 'monster' || hasFlag(c, 'noFlee') || Boolean(c.hasRolled) || c.playerDie !== null
}
