import { ARMOR_SLOTS, CARDS, COMBAT_ONLY_ACTIONS, SOLO_EXCLUDED_ACTIONS, card, printedPower } from './data'
import type { ClassName, RaceName } from './data'
import { activeClass, artifactBoosts, equippedIds, handLimit, hasFlag, isMasteredWeapon, strongestEquipmentPower, computePower } from './power'
import { randomInt, shuffle } from './rng'
import type { Combat, GameAction, GameState, LogEntry, Prompt, PromptOption } from './types'
import { OATH, SOLO_OATH_IDS, oathCompleted, permanentDieBonus } from './oaths'

const MAX_LEVEL = 10
const BOSS_LEVEL = 10
const TAVERN_SIZE = 3

export const BOSS_IDS = CARDS.filter((entry) => entry.type === 'Boss').map((entry) => entry.id)

function num(value: string) {
  return Number.parseInt(value, 10) || 0
}

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
  s.tavernDone = false
  s.combat = null
  s.promptQueue = []
  s.endTurnPending = false
  s.log = []
  s.stats = { monsters: 0, defeats: 0, flees: 0 }
  s.victoryBoss = null
  s.equipment = { armors: { Plastron: null, Bottes: null, Gants: null, Casque: null }, hands: [], artifact: null }
  s.hand = []
  s.draws = []
  s.drawSeq = 0
  drawLoot(s, 5)
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

function drawMonster(s: GameState) {
  if (s.monsterDeck.length === 0 && s.monsterDiscard.length > 0) {
    s.monsterDeck = shuffle(s, s.monsterDiscard)
    s.monsterDiscard = []
    log(s, 'monstersReshuffled')
  }
  const id = s.monsterDeck.shift()
  if (id) s.draws.push({ id, kind: 'monster' })
  return id
}

function rollRaw(s: GameState) {
  return randomInt(s, s.dieSides) + (s.race === 'Elfe' ? 1 : 0) + permanentDieBonus(s)
}

function combatRoll(s: GameState, c: Combat) {
  c.hasRolled = true
  if (hasFlag(c, 'doubleDie')) return rollRaw(s) + rollRaw(s)
  if (hasFlag(c, 'wyrm')) return Math.min(rollRaw(s), rollRaw(s))
  return rollRaw(s)
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

function destroyEquipped(s: GameState, id: string) {
  for (const slot of ARMOR_SLOTS) {
    if (s.equipment.armors[slot] === id) s.equipment.armors[slot] = null
  }
  s.equipment.hands = s.equipment.hands.filter((handId) => handId !== id)
  if (s.equipment.extraArmor?.id === id) s.equipment.extraArmor.id = null
  s.lootDiscard.push(id)
  log(s, 'destroyed', { card: id })
}

// ---------- Equipment ----------

function equip(s: GameState, id: string) {
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
    const size = (cardId: string) => (card(cardId).subtype === 'Deux mains' ? 2 : 1)
    while (s.equipment.hands.reduce((sum, handId) => sum + size(handId), 0) + size(id) > 2) {
      const removed = s.equipment.hands.shift()
      if (removed) s.hand.push(removed)
    }
    s.equipment.hands.push(id)
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

export function canChangeEquipment(s: GameState) {
  if (s.promptQueue.length > 0) return false
  if (s.phase === 'main' && !s.combat) return true
  return s.phase === 'combat' && s.combat !== null && !s.combat.hasRolled && s.combat.playerDie === null && s.combat.bossDie === null
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

function unequip(s: GameState, id: string) {
  if (!equippedIds(s).includes(id)) return
  for (const slot of ARMOR_SLOTS) {
    if (s.equipment.armors[slot] === id) s.equipment.armors[slot] = null
  }
  s.equipment.hands = s.equipment.hands.filter((handId) => handId !== id)
  if (s.equipment.artifact === id) s.equipment.artifact = null
  if (s.equipment.extraArmor?.id === id) s.equipment.extraArmor.id = null
  s.hand.push(id)
  log(s, 'unequip', { card: id })
}

// ---------- Combat start ----------

function startMonsterCombat(s: GameState, id: string, skipFournaise = false) {
  if (!skipFournaise && cardName(id) === 'Fournaise') {
    const choices = [id]
    for (let index = 0; index < 2; index += 1) {
      const extra = drawMonster(s)
      if (extra) choices.push(extra)
    }
    log(s, 'fournaise')
    queue(s, { purpose: 'fournaise', options: choices.map((choice) => ({ id: choice, cardId: choice })), optional: false, ctx: { choices } })
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
      c.ignoredStrongest += 1
      break
    case 'Gobeur':
      c.ignoredStrongest += 2
      break
    case 'Raseciel':
      addFlag(c, 'noFlee')
      break
    case 'Cuirassé':
      addFlag(c, 'cuirasse')
      break
    case 'Lacéreur': {
      const value = rollRaw(s)
      c.monsterBonus += value
      log(s, 'monsterRoll', { card: id, value })
      break
    }
    case 'Tranchebec': {
      const value = randomInt(s, 6)
      if (value >= 4) c.monsterBonus += 2
      log(s, 'monsterRoll', { card: id, value })
      break
    }
    case 'Rafistolé': {
      const value = randomInt(s, 6)
      c.monsterBonus += value <= 2 ? -2 : value >= 5 ? 2 : 0
      log(s, 'monsterRoll', { card: id, value })
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

  const equip: string[] = []
  for (const slot of ARMOR_SLOTS) {
    const best = hand
      .filter((id) => card(id).type === 'Armure' && card(id).subtype === slot)
      .sort((a, b) => printedPower(b) - printedPower(a))[0]
    if (best) equip.push(best)
  }
  let handsUsed = 0
  const weapons = hand.filter((id) => card(id).type === 'Arme').sort((a, b) => printedPower(b) - printedPower(a))
  for (const id of weapons) {
    const size = card(id).subtype === 'Deux mains' ? 2 : 1
    if (handsUsed + size <= 2) {
      equip.push(id)
      handsUsed += size
    }
  }
  c.bossEquip = equip
  let rest = hand.filter((id) => !equip.includes(id))
  const spare = () =>
    rest.filter((id) => !BOSS_PRIORITY.includes(cardName(id)) && !BOSS_REACTIONS.includes(cardName(id))).sort((a, b) => cardValue(a) - cardValue(b))

  switch (bossName) {
    case 'L’Invaincu': {
      const placed = spare().slice(-2)
      rest = rest.filter((id) => !placed.includes(id))
      s.lootDiscard.push(...placed)
      c.bossBonus += placed.length * 2
      log(s, 'bossStack', { count: placed.length })
      break
    }
    case 'La Suzeraine':
      c.bossBonus += 2
      log(s, 'bossDecree')
      break
    case 'Le Martyr': {
      const give = spare().slice(0, 2)
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
      const discard = spare().slice(0, 3)
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
        .sort((a, b) => printedPower(b) - printedPower(a))[0]
      if (armor) {
        queue(s, { purpose: 'envers', options: [...handOptions(s), { id: 'decline' }], optional: false, ctx: { armor } })
      }
      break
    }
    default:
      break
  }

  for (const id of [...rest]) {
    const name = cardName(id)
    if (name === 'Force') {
      c.bossBonus += 2
      rest = rest.filter((other) => other !== id)
      s.lootDiscard.push(id)
      log(s, 'bossForce', { card: id })
    } else if (name === 'Éveil') {
      c.bossSides = 8
      rest = rest.filter((other) => other !== id)
      s.lootDiscard.push(id)
      log(s, 'bossAwakens', { card: id })
    }
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
  const value = randomInt(s, c.bossSides)
  c.bossDie = value
  log(s, 'bossRolled', { value })
}

const BOSS_REACTIONS = ['Destruction', 'Corrosion', 'Dépossession', 'Brise-armure', 'Faiblesse', 'Malchance', 'Chance']

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
function bossReact(s: GameState, c: Combat): boolean {
  if (c.kind !== 'boss' || c.bossDie === null) return false
  const gear = playerGear(s)
  for (const name of BOSS_REACTIONS) {
    const id = c.bossHand.find((handId) => cardName(handId) === name)
    if (!id) continue
    let target: string | undefined
    switch (name) {
      case 'Destruction':
        target = gear[0]?.id
        if (!target) continue
        break
      case 'Corrosion':
        target = gear.find((item) => item.weapon)?.id
        if (!target) continue
        break
      case 'Dépossession':
        if (hasFlag(c, 'ignoreWeapons') || !gear.some((item) => item.weapon)) continue
        break
      case 'Brise-armure':
        if (hasFlag(c, 'ignoreArmors') || !gear.some((item) => !item.weapon)) continue
        break
      case 'Malchance':
        if (c.playerDie === null || c.playerDie <= 0) continue
        break
      default:
        break
    }
    c.bossHand = c.bossHand.filter((other) => other !== id)
    s.lootDiscard.push(id)
    log(s, 'bossPlays', { card: id })
    switch (name) {
      case 'Destruction':
      case 'Corrosion':
        s.equipment.hands = s.equipment.hands.filter((handId) => handId !== target)
        for (const slot of ARMOR_SLOTS) {
          if (s.equipment.armors[slot] === target) s.equipment.armors[slot] = null
        }
        if (s.equipment.extraArmor && s.equipment.extraArmor.id === target) s.equipment.extraArmor.id = null
        s.lootDiscard.push(target as string)
        log(s, 'playerItemDestroyed', { card: target as string })
        break
      case 'Dépossession':
        addFlag(c, 'ignoreWeapons')
        break
      case 'Brise-armure':
        addFlag(c, 'ignoreArmors')
        break
      case 'Faiblesse':
        c.playerBonus -= 2
        break
      case 'Malchance':
        c.playerDie = Math.max(0, (c.playerDie ?? 0) - 2)
        break
      default:
        c.bossDie += 2
    }
    return true
  }
  return false
}

// ---------- Combat resolution ----------

function monsterNames(c: Combat) {
  return c.monsters.map(cardName)
}

function endCombat(s: GameState, c: Combat) {
  s.monsterDiscard.push(...c.monsters)
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
  if (names.includes('Cataclysme')) queueDiscardOne(s)
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
  let levels = 0
  let loot = 0
  for (const id of c.monsters) {
    levels += num(card(id).levelGain)
    loot += num(card(id).loot)
  }
  if (names.includes('Cisailleur') && tie) loot += 1
  if (c.forgoLoot) loot = 0
  let multiplier = c.lootMultiplier
  if (names.includes('Immaculée') && c.playerDie === 6) multiplier *= 2
  loot *= multiplier
  const sporule = names.includes('Sporule')
  if (sporule) {
    levels = 0
    loot = 0
  }
  if (names.includes('Sans-Visage')) {
    for (let index = 0; index < 10 && rollRaw(s) >= 5; index += 1) loot += 1
  }
  s.level = clampLevel(s.level + levels)
  drawLoot(s, loot)
  s.stats.monsters += 1
  log(s, 'victory', { levels, loot })
  postCombat(s, c, tie ? 'tie' : 'win')
  const chain = names.includes('Céramid')
  s.monsterDiscard.push(...c.monsters)
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
  if (!spared) s.level = clampLevel(s.level - 1)
  log(s, 'defeat', { spared: spared ? 1 : 0 })
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
  const value = randomInt(s, 6) + (s.race === 'Elfe' ? 1 : 0) + permanentDieBonus(s)
  if (automatic || s.race === 'Vesskar' || value >= 4) {
    s.stats.flees += 1
    log(s, 'fled', { value: automatic || s.race === 'Vesskar' ? 0 : value })
    postCombat(s, c, 'flee')
    endCombat(s, c)
  } else {
    log(s, 'fleeFailed', { value })
    loseMonster(s)
  }
}

function resolveCombat(s: GameState) {
  const c = s.combat
  if (!c) return
  if (c.kind === 'boss' && c.bossDie === null) rollBossDie(s, c)
  while (bossReact(s, c)) {
    // the Boss plays everything that matters before the verdict
  }
  const power = computePower(s)
  if (!power) return
  const diff = power.player.total - power.opponent.total
  const tie = diff === 0
  const wins = diff > 0 || (tie && !hasFlag(c, 'tieLoses'))
  log(s, 'resolved', { player: power.player.total, opponent: power.opponent.total })

  if (c.kind === 'boss') {
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
  if (s.promptQueue.length > 0 || (s.phase !== 'main' && s.phase !== 'combat')) return false
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
    case 'Brise-armure':
    case 'Destruction':
      return boss && c.bossEquip.length > 0
    case 'Corrosion':
      return boss && c.bossEquip.some((equipId) => card(equipId).type === 'Arme')
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
    if (hasFlag(c, 'cuirasse') && c.actionsPlayed === 0) cancelled = true
    if (hasFlag(c, 'molosse') && c.actionsPlayed === 0) {
      c.monsterBonus += 2
      log(s, 'molosse')
    }
    c.actionsPlayed += 1
  }
  if (cancelled) {
    log(s, 'actionCancelled')
    return
  }
  if (c) c.resolvedActions = (c.resolvedActions ?? 0) + 1

  switch (name) {
    case 'Force':
      if (c) c.playerBonus += 2
      break
    case 'Chance':
      if (c && c.playerDie !== null) c.playerDie += 2
      break
    case 'Malchance':
      if (c && c.bossDie !== null) c.bossDie = Math.max(0, c.bossDie - 2)
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
          .filter((equipId) => name === 'Destruction' || card(equipId).type === 'Arme')
          .sort((a, b) => printedPower(b) - printedPower(a))
        if (targets[0]) {
          c.bossEquip = c.bossEquip.filter((equipId) => equipId !== targets[0])
          s.lootDiscard.push(targets[0])
          log(s, 'bossItemDestroyed', { card: targets[0] })
        }
      }
      break
    case 'Cupidité': {
      const value = rollRaw(s)
      log(s, 'greedRoll', { value })
      if (c && value >= 4) c.lootMultiplier *= 2
      break
    }
    case 'Exécution': {
      const value = rollRaw(s)
      log(s, 'executionRoll', { value })
      if (value >= 6) winMonster(s, false)
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
        options: (['Guerrier', 'Druide', 'Chasseur', 'Mage', 'Voleur', 'Nécromancien'] as const).map((id) => ({ id })),
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

export type ActiveBlockReason = { code: 'ended' | 'choice' | 'combat-only' | 'outside-combat' | 'monster-block' | 'used-combat' | 'used-turn' | 'weapon-cost' | 'armor-cost' | 'armor-equipped' | 'roll-first' | 'cards-cost' | 'monster-discard-empty' | 'monster-deck-empty'; required?: number; current?: number }
export type ActiveStatus = { klass: ClassName; available: boolean; reasons: ActiveBlockReason[] }

export function activeStatus(s: GameState): ActiveStatus {
  const klass = activeClass(s)
  const c = s.combat
  const reasons: ActiveBlockReason[] = []
  if (s.phase !== 'main' && s.phase !== 'combat') reasons.push({ code: 'ended' })
  if (s.promptQueue.length > 0) reasons.push({ code: 'choice' })
  const outside = klass === 'Chasseur' || klass === 'Voleur'
  if (outside) {
    if (c) reasons.push({ code: 'outside-combat' })
    if (s.turnFlags.includes(klass === 'Chasseur' ? 'hunter' : 'thief')) reasons.push({ code: 'used-turn' })
  } else {
    if (!c) reasons.push({ code: 'combat-only' })
    if (c && hasFlag(c, 'noActive')) reasons.push({ code: 'monster-block' })
    if (c?.used.includes(klass)) reasons.push({ code: 'used-combat' })
  }
  switch (klass) {
    case 'Guerrier': if (!s.hand.some((id) => card(id).type === 'Arme')) reasons.push({ code: 'weapon-cost' }); break
    case 'Druide':
      if (!s.hand.some((id) => card(id).type === 'Armure')) reasons.push({ code: 'armor-cost' })
      if (!equippedOptions(s, true).length) reasons.push({ code: 'armor-equipped' })
      break
    case 'Mage': if (c && c.playerDie === null) reasons.push({ code: 'roll-first' }); break
    case 'Nécromancien': if (!s.monsterDiscard.length) reasons.push({ code: 'monster-discard-empty' }); break
    case 'Chasseur': if (!s.monsterDeck.length) reasons.push({ code: 'monster-deck-empty' }); break
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
      startPay(s, 'hunter', 1)
      break
    case 'Voleur':
      startPay(s, 'thief', artifactBoosts(s, 'Voleur') ? 1 : 2)
      break
  }
}

function finishPay(s: GameState, kind: string) {
  const c = s.combat
  switch (kind) {
    case 'druid': {
      if (!c) break
      const count = artifactBoosts(s, 'Druide') ? 2 : 1
      const armors = equippedOptions(s, true)
        .map((option) => option.id)
        .sort((a, b) => printedPower(b) - printedPower(a))
        .slice(0, count)
      c.doubledArmors.push(...armors)
      c.used.push('Druide')
      log(s, 'druid', { count: armors.length })
      break
    }
    case 'mage': {
      if (!c || c.playerDie === null) break
      c.used.push('Mage')
      const fresh = combatRoll(s, c)
      log(s, 'mageReroll', { value: fresh })
      if (artifactBoosts(s, 'Mage')) {
        c.playerDie += fresh
      } else {
        queue(
          s,
          { purpose: 'mage-keep', options: [{ id: 'keep-old' }, { id: 'keep-new' }], optional: false, ctx: { old: c.playerDie, fresh } },
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
    case 'thief': {
      s.turnFlags.push('thief')
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
  if (option === null) {
    if (!prompt.optional) return
  } else if (!prompt.options.some((entry) => entry.id === option)) {
    return
  }
  s.promptQueue.shift()
  const c = s.combat
  const choices = Array.isArray(prompt.ctx.choices) ? (prompt.ctx.choices as string[]) : []

  switch (prompt.purpose) {
    case 'oath-armor-slot':
      if (option && ARMOR_SLOTS.includes(option as (typeof ARMOR_SLOTS)[number])) s.equipment.extraArmor = { slot: option, id: null }
      break
    case 'oath-boss-action':
      if (option) {
        const index = s.lootDiscard.lastIndexOf(option)
        if (index >= 0) { s.lootDiscard.splice(index, 1); s.hand.push(option); log(s, 'oathActionGained', { card: option }) }
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
        startMonsterCombat(s, option, true)
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
          log(s, 'rerolled', { value: c.playerDie })
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
      if (option === null) break
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
      if (c) c.playerDie = option === 'keep-new' ? (prompt.ctx.fresh as number) : (prompt.ctx.old as number)
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
        log(s, 'tavernSkip')
        break
      }
      {
        const give = handOptions(s)
        if (give.length === 0) {
          s.lootDiscard.push(...choices.filter((id) => id !== option))
          s.hand.push(option)
          break
        }
        queue(
          s,
          { purpose: 'tavern-give', options: [...give, { id: 'tavern-back' }], optional: false, ctx: { taken: option, choices } },
          true,
        )
      }
      break
    case 'tavern-give':
      if (option === 'tavern-back') {
        queue(s, { purpose: 'tavern', options: choices.map((id) => ({ id, cardId: id })), optional: true, ctx: { choices } }, true)
        break
      }
      if (option) {
        discardFromHand(s, option)
        if (choices.length > 0) {
          s.hand.push(prompt.ctx.taken as string)
          s.lootDiscard.push(...choices.filter((id) => id !== prompt.ctx.taken))
        }
        log(s, 'tavernSwap', { card: prompt.ctx.taken as string, give: option })
      }
      break
    case 'envers':
      if (c) {
        if (option === 'decline') {
          c.stolenArmor = prompt.ctx.armor as string
          c.bossBonus += printedPower(prompt.ctx.armor as string)
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
          ctx: { choices },
        })
        return
      }
    }
  }
  const limit = handLimit(s)
  if (s.hand.length > limit) {
    queue(s, { purpose: 'discard-excess', options: handOptions(s), optional: false, ctx: { count: s.hand.length - limit } })
    return
  }
  s.tavernDone = false
  s.endTurnPending = false
  s.turn += 1
  s.mimic = null
  s.turnFlags = []
  s.excessDiscarded = 0
  if (s.level >= BOSS_LEVEL) {
    s.bossPressure += 1
    log(s, 'bossGrows', { count: s.bossPressure })
  }
  log(s, 'newTurn', { turn: s.turn })
}

function settle(s: GameState) {
  if (s.promptQueue.length > 0) return
  if (s.endTurnPending && !s.combat && s.phase === 'main') endTurnNow(s)
}

export function reduce(state: GameState, action: GameAction): GameState {
  if (state.phase === 'won' || state.phase === 'lost') return state
  const s = structuredClone(state)
  s.draws = []
  const result = apply(s, action)
  if (result.draws.length > 0) result.drawSeq += 1
  return result
}

function apply(s: GameState, action: GameAction): GameState {
  if (action.t === 'answer') {
    answerPrompt(s, action.option)
    settle(s)
    return s
  }
  if (s.promptQueue.length > 0) return s

  const main = s.phase === 'main' && !s.combat
  switch (action.t) {
    case 'equip':
      if (canEquip(s, action.id)) equip(s, action.id)
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
        log(s, 'rolled', { value: c.playerDie })
        if (c.kind === 'boss' && c.bossDie === null) rollBossDie(s, c)
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
        log(s, 'oathRerolled', { value: c.playerDie })
      }
      break
    }
    case 'resolve':
      resolveCombat(s)
      break
    case 'bossStep': {
      const c = s.combat
      if (c && c.kind === 'boss') {
        if (c.bossDie === null) rollBossDie(s, c)
        else if (!bossReact(s, c)) resolveCombat(s)
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
  return !c || c.kind !== 'monster' || hasFlag(c, 'noFlee')
}
