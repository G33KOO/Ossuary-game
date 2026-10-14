import { describe, expect, it } from 'vitest'
import { CARDS, CLASS_NAMES, RACE_NAMES, SOLO_EXCLUDED_ACTIONS, card } from './data'
import { activeStatus, BOSS_IDS, canPlayAction, canWeaponReroll, newGame, reduce } from './engine'
import { bossEquipmentPower, computePower, equipmentCardPower, handLimit } from './power'
import { actionVisual } from './actionVisual'
import type { GameState } from './types'

const id = (name: string) => CARDS.find((entry) => entry.name === name)!.id
function encounter(name = 'Tranchebec'): GameState {
  let state = newGame('Guerrier', 'Humain', 42)
  state.promptQueue = []
  const monster = id(name)
  state.monsterDeck = [monster, ...state.monsterDeck.filter((entry) => entry !== monster)]
  state = reduce(state, { t: 'fightMonster' })
  state.promptQueue = []
  return state
}
function boss(): GameState {
  let state = newGame('Mage', 'Humain', 42)
  state.promptQueue = []
  state.level = 10
  state = reduce(state, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
  state.promptQueue = []
  state.combat!.bossHand = []
  state.combat!.bossDie = 3
  return state
}

describe('card effects', () => {
  it.each(CARDS.filter((entry) => entry.type === 'Armure'))('uses the printed Power of $name in its slot', (entry) => {
    const state = encounter()
    state.equipment.armors[entry.subtype] = entry.id
    expect(equipmentCardPower(state, entry.id)).toBe(Number(entry.value))
    state.combat!.doubledArmors.push(entry.id)
    expect(equipmentCardPower(state, entry.id)).toBe(Number(entry.value) * 2)
  })

  it.each(CARDS.filter((entry) => entry.type === 'Arme' && entry.requirement?.startsWith('Maîtrise')))('applies mastery and Orc bonus to $name', (entry) => {
    const state = encounter()
    state.klass = CLASS_NAMES.find((klass) => entry.requirement!.includes(klass))!
    state.race = 'Orc'
    state.equipment.hands = [entry.id]
    expect(equipmentCardPower(state, entry.id)).toBe(Number(entry.value) * 2 + 1)
  })

  it.each([
    ['Masse Mille-Clous', 'Tranchebec', 2], ['Masse Nautile', 'Tranchebec', 2],
    ['Masse Nautile', 'Gobeur', 1], ['Hache Léviathan à deux mains', 'Wyrm', 3],
    ['Hache Léviathan à deux mains', 'Gobeur', 2],
  ] as const)('applies %s against %s', (weapon, monster, expected) => {
    const state = encounter(monster)
    state.equipment.hands = [id(weapon)]
    expect(equipmentCardPower(state, id(weapon))).toBe(expected)
  })
  it('removes the free-hand bonus when a second Weapon is equipped', () => {
    const state = encounter()
    state.equipment.hands = [id('Masse Mille-Clous'), id('Masse Nautile')]
    expect(equipmentCardPower(state, id('Masse Mille-Clous'))).toBe(1)
  })
  it('boosts Brise-Enclume by 2 only against a Boss', () => {
    const state = boss()
    state.equipment.hands = [id('Hache Brise-Enclume à deux mains')]
    expect(equipmentCardPower(state, state.equipment.hands[0])).toBe(4)
  })
  it('also applies special weapon Power when the Boss equips the weapon', () => {
    const state=boss()
    state.combat!.bossEquip=[id('Masse Mille-Clous')]
    expect(bossEquipmentPower(state.combat!)).toBe(2)
    state.combat!.bossEquip=[id('Hache Brise-Enclume à deux mains')]
    expect(bossEquipmentPower(state.combat!)).toBe(4)
  })
  it('draws Bastion salvage when destroyed by a Boss, but not when unequipped', () => {
    let state = boss()
    state.equipment.hands = [id('Masse du Bastion')]
    state.combat!.bossHand = [id('Destruction')]
    const handSize = state.hand.length
    state = reduce(state, { t: 'bossStep' })
    expect(state.hand).toHaveLength(handSize + 1)
    expect(state.log.some((entry) => entry.code === 'weaponSalvage')).toBe(true)
    state = encounter()
    state.equipment.hands = [id('Masse du Bastion')]
    state = reduce(state, { t: 'unequip', id: id('Masse du Bastion') })
    expect(state.log.some((entry) => entry.code === 'weaponSalvage')).toBe(false)
  })
  it('protects Clairfeuille from Boss destruction', () => {
    let state = boss()
    state.equipment.hands = [id('Hache Clairfeuille')]
    state.combat!.bossHand = [id('Destruction'), id('Corrosion')]
    state = reduce(state, { t: 'bossStep' })
    expect(state.equipment.hands).toContain(id('Hache Clairfeuille'))
  })
  it('sacrifices Brasier for a new roll only after rolling', () => {
    let state = encounter()
    state.equipment.hands = [id('Baguette Brasier')]
    expect(canWeaponReroll(state, state.equipment.hands[0])).toBe(false)
    state = reduce(state, { t: 'roll' })
    expect(canWeaponReroll(state, id('Baguette Brasier'))).toBe(true)
    state = reduce(state, { t: 'weaponReroll', id: id('Baguette Brasier') })
    expect(state.equipment.hands).toEqual([])
    expect(state.lootDiscard).toContain(id('Baguette Brasier'))
    expect(state.combat!.playerDie).toBeGreaterThanOrEqual(1)
    expect(state.log.at(-1)?.code).toBe('weaponRerolled')
  })
  it('offers the Fetish sacrifice after victory and awards exactly 2 extra Loot', () => {
    let state = encounter()
    state.equipment.hands = [id('Hache Fétiche à deux mains')]
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'resolve' })
    expect(state.promptQueue[0].purpose).toBe('weapon-loot')
    const before = state.hand.length
    state = reduce(state, { t: 'answer', option: id('Hache Fétiche à deux mains') })
    expect(state.hand).toHaveLength(before + 2)
    expect(state.equipment.hands).toEqual([])
  })

  it.each([
    ['Raseciel', 'noFlee'], ['Cuirassé', 'cuirasse'], ['Hurlemort', 'levelZero'],
    ['Dévoreur', 'noActive'], ['Souriant', 'ignoreAll'], ['Encloué', 'noChanceForce'],
    ['Mordefiel', 'noActions'], ['Wyrm', 'wyrm'], ['Golem', 'golem'],
    ['Molosse', 'molosse'], ['Fielpeau', 'fielpeau'], ['Exarque', 'tieLoses'],
  ])('enforces the restriction of %s', (name, flag) => {
    expect(encounter(name).combat!.flags).toContain(flag)
  })
  it.each(['Féticheur', 'Sauvageonne', 'Fumefange', 'Aiguemorte', 'Le Créateur'])('requires a decision before resolving %s', (name) => {
    let state = newGame('Mage', 'Humain', 42)
    state.promptQueue = []
    state.monsterDeck.unshift(id(name))
    state = reduce(state, { t: 'fightMonster' })
    expect(state.promptQueue).toHaveLength(1)
    expect(reduce(state, { t: 'resolve' }).phase).toBe('combat')
  })
  it('allows self buffs before Cuirassé blocks its first targeted Action', () => {
    let state = encounter('Cuirassé')
    state.hand = [id('Force'), id('Faiblesse'), id('Apaiser')]
    state = reduce(state, { t: 'playAction', id: id('Force') })
    expect(state.combat!.playerBonus).toBe(2)
    state = reduce(state, { t: 'playAction', id: id('Faiblesse') })
    expect(state.combat!.monsterBonus).toBe(0)
    state = reduce(state, { t: 'playAction', id: id('Apaiser') })
    expect(state.combat!.monsterBonus).toBe(-2)
  })
  it('lets Gobeur ignore the two chosen pieces, rather than the most powerful', () => {
    let state = newGame('Mage', 'Humain', 42)
    state.promptQueue = []
    state.equipment.armors.Plastron = id('Plastron Cœur-de-Dragon')
    state.equipment.armors.Bottes = id('Bottes Longue-Piste')
    state.equipment.armors.Gants = id('Gants Nervurés')
    state.monsterDeck.unshift(id('Gobeur'))
    state = reduce(state, { t: 'fightMonster' })
    state = reduce(state, { t: 'answer', option: id('Bottes Longue-Piste') })
    state = reduce(state, { t: 'answer', option: id('Gants Nervurés') })
    expect(computePower(state)!.player.equipment).toBe(3)
  })
  it('resolves a summoned Fournaise without replacing the original encounter or losing buffs', () => {
    let state=encounter()
    state.combat!.playerBonus=7
    state.monsterDeck.unshift(id('Fournaise'))
    state.hand=[id('Invocation')]
    state=reduce(state,{t:'playAction',id:state.hand[0]})
    expect(state.promptQueue[0].purpose).toBe('fournaise')
    expect(state.promptQueue[0].options.map((option) => option.id)).not.toContain(id('Fournaise'))
    const selected = state.promptQueue[0].options[0].id
    state=reduce(state,{t:'answer',option:selected})
    expect(state.combat!.monsters).toEqual([id('Tranchebec'),selected])
    expect(state.combat!.playerBonus).toBe(7)
    expect(state.monsterDeck).toContain(id('Fournaise'))
  })
  it('excludes Fournaise from its own trial and rejects selecting it', () => {
    let state = newGame('Mage', 'Humain', 42)
    state.promptQueue = []
    state.monsterDeck = [id('Fournaise'), id('Tranchebec'), id('Gobeur')]
    state = reduce(state, { t: 'fightMonster' })
    expect(state.promptQueue[0].options.map((option) => option.id)).toEqual([id('Tranchebec'), id('Gobeur')])
    expect(reduce(state, { t: 'answer', option: id('Fournaise') }).promptQueue).toEqual(state.promptQueue)
    state = reduce(state, { t: 'answer', option: id('Tranchebec') })
    expect(state.combat!.monsters).toEqual([id('Tranchebec')])
    expect(state.promptQueue).toEqual([])
    expect(state.monsterDeck.sort()).toEqual([id('Fournaise'), id('Gobeur')].sort())
  })
  it('finishes the trial without a blocking choice if no other Monster is available', () => {
    let state = newGame('Mage', 'Humain', 42)
    state.promptQueue = []
    state.monsterDeck = [id('Fournaise')]
    state.monsterDiscard = []
    state = reduce(state, { t: 'fightMonster' })
    expect(state.promptQueue).toEqual([])
    expect(state.combat).toBeNull()
    expect(state.endTurnPending).toBe(true)
    expect(state.monsterDeck).toEqual([id('Fournaise')])
  })
  it('requires the Cataclysme discard immediately upon revealing it', () => {
    let state=newGame('Mage','Humain',42)
    state.promptQueue=[];state.monsterDeck.unshift(id('Cataclysme'))
    state=reduce(state,{t:'fightMonster'})
    expect(state.promptQueue[0].purpose).toBe('discard-one')
    expect(reduce(state,{t:'roll'}).combat!.playerDie).toBeNull()
  })
  it('lets Druide choose Armor and repeat on a different piece', () => {
    let state = encounter()
    state.klass = 'Druide'
    state.equipment.armors.Plastron = id('Plastron Cœur-de-Dragon')
    state.equipment.armors.Bottes = id('Bottes Longue-Piste')
    state.hand = [id('Gants Nervurés'), id('Casque Bois-Cornu')]
    state = reduce(state, { t: 'useActive' })
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    expect(state.promptQueue[0].purpose).toBe('druid-pick')
    state = reduce(state, { t: 'answer', option: id('Bottes Longue-Piste') })
    expect(equipmentCardPower(state, id('Bottes Longue-Piste'))).toBe(2)
    expect(equipmentCardPower(state, id('Plastron Cœur-de-Dragon'))).toBe(3)
    expect(activeStatus(state).available).toBe(true)
  })
  it('lets Chasseur track a Boss at level 10', () => {
    let state = newGame('Chasseur', 'Humain', 42)
    state.promptQueue = []
    state.level = 10
    state = reduce(state, { t: 'useActive' })
    state = reduce(state, { t: 'answer', option: 'hunt-boss' })
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    expect(state.promptQueue[0].purpose).toBe('hunter-boss-pick')
    expect(state.promptQueue[0].options).toHaveLength(3)
    state = reduce(state, { t: 'answer', option: state.promptQueue[0].options[1].id })
    expect(state.combat!.kind).toBe('boss')
  })
  it('destroys the chosen Boss item, rather than automatically destroying the strongest', () => {
    let state = boss()
    state.combat!.bossEquip = [id('Plastron Cœur-de-Dragon'), id('Masse Nautile')]
    state.hand = [id('Destruction')]
    state = reduce(state, { t: 'playAction', id: state.hand[0] })
    expect(state.promptQueue[0].purpose).toBe('boss-destroy')
    state = reduce(state, { t: 'answer', option: id('Masse Nautile') })
    expect(state.combat!.bossEquip).toEqual([id('Plastron Cœur-de-Dragon')])
    expect(state.lootDiscard).toContain(id('Masse Nautile'))
  })
  it('grants the Mage artifact addition once per turn, then offers the ordinary reroll choice', () => {
    let state = boss()
    state.klass = 'Mage'
    state.equipment.artifact = id('Astrolabe des Arcanes')
    state.hand = [id('Masse Nautile'), id('Gants Nervurés')]
    state.combat!.playerDie = 6
    state = reduce(state, { t: 'useActive' })
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    if (state.promptQueue[0]?.purpose === 'mage-target') state = reduce(state, { t: 'answer', option: 'mage-player' })
    expect(state.combat!.playerDie).toBeGreaterThan(6)
    expect(state.turnFlags).toContain('mage-artifact')
    state = reduce(state, { t: 'useActive' })
    state = reduce(state, { t: 'answer', option: state.hand[0] })
    if (state.promptQueue[0]?.purpose === 'mage-target') state = reduce(state, { t: 'answer', option: 'mage-player' })
    expect(state.promptQueue[0].purpose).toBe('mage-keep')
  })
  it('applies the Elfe die bonus and the Nain additional adventure Loot', () => {
    const base = encounter()
    const elf = structuredClone(base)
    elf.race = 'Elfe'
    expect(reduce(elf, { t: 'roll' }).combat!.playerDie! - reduce(base, { t: 'roll' }).combat!.playerDie!).toBe(1)
    let dwarf = newGame('Mage', 'Nain', 42)
    dwarf.promptQueue = []
    const before = dwarf.hand.length
    dwarf = reduce(dwarf, { t: 'drawLoot' })
    expect(dwarf.hand).toHaveLength(before + 2)
  })
  it('adds the Lunefeuille escape bonus to the same random roll', () => {
    const base = encounter()
    const dagger = structuredClone(base)
    dagger.equipment.hands = [id('Dague Lunefeuille')]
    const value = (state: GameState) => Number(reduce(state, { t: 'flee' }).log.findLast((event) => event.code === 'fled' || event.code === 'fleeFailed')!.params!.value)
    expect(value(dagger)-value(base)).toBe(1)
  })
  it.each([
    ['Rapiécé', true], ['Orant', true], ['Nécropode', false], ['Réanimateur', false], ['Souverain', false], ['Arachnarque', false],
  ] as const)('applies the defeat consequence of %s', (name, spared) => {
    let state = encounter(name)
    state.level = 4
    state.equipment.armors.Plastron = id('Plastron Écaillefer')
    state.combat!.playerBonus = -100
    const hand = state.hand.length
    state = reduce(state, { t: 'resolve' })
    expect(state.level).toBe(spared ? 4 : 3)
    if (name === 'Nécropode') expect(state.hand).toHaveLength(hand+1)
    if (name === 'Réanimateur') expect(state.nextMonsterPenalty).toBe(3)
    if (name === 'Souverain') expect(state.promptQueue[0].purpose).toBe('discard-one')
    if (name === 'Arachnarque') expect(state.promptQueue[0].purpose).toBe('destroy-equip')
  })
  it('requires two wins for Broyeur, but allows Exécution to win the whole encounter', () => {
    let state = encounter('Broyeur')
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'resolve' })
    expect(state.combat!.rounds).toBe(1)
    state = reduce(state, { t: 'resolve' })
    expect(state.combat).toBeNull()
    // Find a deterministic D6 success without depending on an implementation-specific RNG value.
    for (let seed=1;seed<100;seed++) {
      state=encounter('Broyeur'); state.seed=seed; state.race='Elfe'; state.hand=[id('Exécution')]
      state=reduce(state,{t:'playAction',id:id('Exécution')})
      if(state.log.some(event=>event.code==='victory')) { expect(state.combat).toBeNull(); return }
    }
    throw new Error('No successful execution roll in the deterministic sample')
  })
  it.each(BOSS_IDS)('executes the preparation of Boss %s', (bossId) => {
    let state=newGame('Mage','Humain',42); state.promptQueue=[]; state.level=10
    const actions=['Trouvaille','Providence','Renoncement','Vœu','Mimétisme'].map(id)
    state.lootDeck=[...actions]
    state.equipment.armors.Plastron=id('Plastron Cœur-de-Dragon')
    state.lootDiscard=[id('Force'),id('Chance'),id('Providence')]
    state.monsterDiscard=[id('Wyrm'),id('Tranchebec'),id('Fouisseur')]
    state=reduce(state,{t:'challengeBoss',bossId})
    const name=card(bossId).name
    if(name==='L’Invaincu') expect(state.combat!.bossBonus).toBe(4)
    if(name==='La Suzeraine') {
      expect(state.combat!.bossBonus).toBe(0)
      expect(state.promptQueue[0].purpose).toBe('suzeraine')
      state=reduce(state,{t:'answer',option:'boss-bonus'})
      expect(state.combat!.bossBonus).toBe(2)
    }
    if(name==='Le Martyr') expect(state.combat!.bossBonus).toBe(2)
    if(name==='Zénith') expect(state.combat!.bossBonus).toBe(4)
    if(name==='Le Parfait') expect(state.log.some(event=>event.code==='bossRecovers')).toBe(true)
    if(name==='L’Envers') { state=reduce(state,{t:'answer',option:'decline'}); expect(state.combat!.stolenArmor).toBe(id('Plastron Cœur-de-Dragon')); expect(computePower(state)!.player.equipment).toBe(0) }
  })
  it('grants two actual trades with Vitrail, then discards the favor', () => {
    let state = encounter('Vitrail')
    state.combat!.playerBonus = 100
    state = reduce(state, { t: 'resolve' })
    expect(state.retainedMonsters).toContain(id('Vitrail'))
    state = reduce(state, { t: 'endTurn' })
    while (state.promptQueue[0]?.purpose === 'discard-excess') state = reduce(state, { t: 'answer', option: state.hand.at(-1)! })
    expect(state.promptQueue[0].purpose).toBe('tavern')
    for (let index = 0; index < 2; index++) {
      state = reduce(state, { t: 'answer', option: state.promptQueue[0].options[0].id })
      state = reduce(state, { t: 'answer', option: state.hand[0] })
    }
    expect(state.log.filter((entry) => entry.code === 'tavernSwap')).toHaveLength(2)
    expect(state.retainedMonsters).toEqual([])
    expect(state.monsterDiscard).toContain(id('Vitrail'))
  })
  it('forces Sème-Peste once next turn after escaping, without looping forever', () => {
    let state = encounter('Sème-Peste')
    state.race = 'Vesskar'
    state.hand = []
    state = reduce(state, { t: 'flee' })
    state = reduce(state, { t: 'endTurn' })
    expect(state.combat!.monsters).toContain(id('Sème-Peste'))
    expect(state.combat!.flags).toContain('pest-retry')
    state = reduce(state, { t: 'flee' })
    expect(state.combat).toBeNull()
    expect(state.monsterDiscard).toContain(id('Sème-Peste'))
  })
  it.each(RACE_NAMES)('preserves the passive rules of race %s', (race) => {
    const state = newGame('Mage', race, 42)
    expect(handLimit(state)).toBe(race === 'Humain' ? 6 : 5)
    expect(state.promptQueue[0].ctx.keep).toBe(race === 'Revenant' ? 2 : 1)
  })
  it.each(CARDS.filter((entry) => entry.type === 'Action' && !SOLO_EXCLUDED_ACTIONS.has(entry.name)))('has an executable solo path and animation for $name', (entry) => {
    let state = boss()
    if (['Peur', 'Frénésie', 'Apaiser', 'Cupidité', 'Exécution', 'Invocation'].includes(entry.name)) state = encounter()
    state.level = 5
    state.hand = [entry.id, id('Masse Nautile')]
    state.combat!.playerDie = 4
    state.combat!.bossEquip = [id('Masse Nautile'), id('Gants Nervurés')]
    if (entry.name === 'Contre-sort') {
      state.combat!.bossHand = [id('Faiblesse')]
      state = reduce(state, { t: 'bossStep' })
      expect(state.promptQueue[0].purpose).toBe('boss-counter')
      state = reduce(state, { t: 'answer', option: entry.id })
      expect(state.lootDiscard).toContain(entry.id)
      expect(state.combat!.playerBonus).toBe(0)
      expect(state.log.some(event => event.code === 'playerCounter')).toBe(true)
      return
    }
    expect(canPlayAction(state, entry.id)).toBe(true)
    state = reduce(state, { t: 'playAction', id: entry.id })
    expect(state.lootDiscard).toContain(entry.id)
    expect(state.log.some((event) => event.code === 'actionPlayed')).toBe(true)
    expect(['boost', 'weaken', 'destroy', 'dice', 'draw', 'summon', 'strike', 'flee', 'magic']).toContain(actionVisual(entry.name).effect)
    expect(card(entry.id).text).toBeTruthy()
  })
})
