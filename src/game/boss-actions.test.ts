import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARDS } from './data'
import { BOSS_IDS, canPlayAction, newGame, reduce } from './engine'
import { loadGame, saveGame } from './save'

afterEach(() => vi.unstubAllGlobals())

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function battle() {
  let game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []
  game.level = 10
  game = reduce(game, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
  game.promptQueue = []
  game.hand = []
  game.combat!.bossHand = []
  game.combat!.bossEquip = []
  game.combat!.bossBonus = 0
  game.combat!.bossPlayedCards = []
  return game
}

describe('interactive Boss actions', () => {
  it('upgrades an old save with missing Counterspells once, without duplicating an existing copy', () => {
    const game = battle()
    const counters = CARDS.filter(card => card.name === 'Contre-sort').map(card => card.id)
    game.lootDeck = game.lootDeck.filter(id => !counters.includes(id))
    game.lootDiscard = game.lootDiscard.filter(id => !counters.includes(id))
    game.hand = [counters[0]]
    game.combat!.bossDie = 3
    delete game.counterspellsEnabled
    const store = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value) } })
    saveGame(game)
    const resumed = loadGame()!
    expect([...resumed.hand, ...resumed.lootDeck, ...resumed.lootDiscard].filter(id => counters.includes(id))).toHaveLength(4)
    expect(resumed.combat!.bossDie).toBe(3)
    saveGame(resumed)
    const second = loadGame()!
    expect(second.lootDeck).toEqual(resumed.lootDeck)
    expect(second.seed).toBe(resumed.seed)
  })
  it.each([false, true])('automatically counters a harmful player action (rolled: %s)', rolled => {
    let game = battle()
    game.hand = [id('Faiblesse')]
    game.combat!.bossHand = [id('Contre-sort')]
    if (rolled) game = reduce(game, { t: 'roll' })
    expect(canPlayAction(game, id('Faiblesse'))).toBe(true)
    game = reduce(game, { t: 'playAction', id: id('Faiblesse') })
    expect(game.combat!.monsterBonus).toBe(0)
    expect(game.combat!.bossHand).toEqual([])
    expect(game.lootDiscard).toEqual(expect.arrayContaining([id('Faiblesse'), id('Contre-sort')]))
    expect(game.log.at(-1)?.code).toBe('actionCancelled')
    expect(game.phase).toBe('combat')
  })
  it('does not waste a Counterspell on a level-10 Renoncement that empties the hero hand', () => {
    let game = battle()
    game.hand = [id('Renoncement'), id('Force')]
    game.combat!.bossHand = [id('Contre-sort')]
    game = reduce(game, { t: 'playAction', id: id('Renoncement') })
    expect(game.hand).toEqual([])
    expect(game.combat!.bossHand).toContain(id('Contre-sort'))
    expect(game.log.at(-1)?.code).not.toBe('actionCancelled')
  })

  it('plays preparation, rolls, plays dice modifiers, then leaves the verdict to the player', () => {
    let game = battle()
    game.combat!.bossHand = ['Force', 'Faiblesse', 'Chance', 'Malchance'].map(id)
    game = reduce(game, { t: 'roll' })
    expect(game.combat!.bossDie).toBeNull()
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossBonus).toBe(2)
    expect(game.combat!.bossDie).toBeNull()
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.playerBonus).toBe(-2)
    expect(game.combat!.bossDie).toBeNull()
    game = reduce(game, { t: 'bossStep' })
    const die = game.combat!.bossDie!
    expect(die).toBeGreaterThan(0)
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossDie).toBe(die + 2)
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.playerDieModifier).toBeLessThan(0)
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossReady).toBe(true)
    expect(game.phase).toBe('combat')
    game.hand = [id('Chance')]
    const before = game.combat!.playerDie!
    game = reduce(game, { t: 'playAction', id: id('Chance') })
    expect(game.combat!.playerDie).toBe(before + 2)
    expect(game.phase).toBe('combat')
    game = reduce(game, { t: 'resolve' })
    expect(['won', 'lost']).toContain(game.phase)
  })

  it('forces the hero out with Fear without a defeat and advances enrage on manual end', () => {
    let game = battle()
    game.bossEnrageArmed = true
    game.bossPressure = 2
    game.combat!.bossHand = [id('Peur'), id('Chance')]
    game.combat!.bossEquip = [id('Masse Nautile')]
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat).toBeNull()
    expect(game.phase).toBe('main')
    expect(game.level).toBe(10)
    expect(game.stats.defeats).toBe(0)
    expect(game.endTurnPending).toBe(true)
    expect(game.lootDiscard).toEqual(expect.arrayContaining([id('Peur'), id('Chance'), id('Masse Nautile')]))
    game = reduce(game, { t: 'endTurn' })
    expect(game.bossPressure).toBe(3)
  })

  it('offers a player Counterspell to cancel Fear before its effect', () => {
    let game = battle()
    game.hand = [id('Contre-sort')]
    game.combat!.bossHand = [id('Peur')]
    game = reduce(game, { t: 'bossStep' })
    expect(game.promptQueue[0].purpose).toBe('boss-counter')
    expect(game.combat).not.toBeNull()
    game = reduce(game, { t: 'answer', option: id('Contre-sort') })
    expect(game.combat).not.toBeNull()
    expect(game.hand).toEqual([])
    expect(game.log.at(-1)?.code).toBe('playerCounter')
  })

  it('draws and plays fresh boosts before its die and equips fresh loot', () => {
    let game = battle()
    game.combat!.bossHand = [id('Providence')]
    game.lootDeck = ['Force', 'Masse Nautile', 'Chance'].map(id)
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossEquip).toContain(id('Masse Nautile'))
    expect(game.combat!.bossHand).toEqual([id('Force'), id('Chance')])
    expect(game.combat!.bossDie).toBeNull()
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossBonus).toBe(2)
    expect(game.combat!.bossDie).toBeNull()
  })

  it('stacks all relevant Chance cards with a consistent modifier', () => {
    let game = battle()
    game.combat!.bossHand = CARDS.filter(card => card.name === 'Chance').slice(0, 2).map(card => card.id)
    game.combat!.bossDie = 3
    game = reduce(reduce(game, { t: 'bossStep' }), { t: 'bossStep' })
    expect(game.combat!.bossDie).toBe(7)
    expect(game.combat!.bossDieModifier).toBe(4)
  })
  it('keeps Malchance available for a hero who rolls after the Boss', () => {
    let game = battle()
    game.combat!.bossHand = [id('Malchance')]
    game = reduce(reduce(game, { t: 'bossStep' }), { t: 'bossStep' })
    expect(game.combat!.bossReady).toBe(true)
    expect(game.combat!.bossHand).toContain(id('Malchance'))
    game = reduce(game, { t: 'roll' })
    expect(game.combat!.bossReady).toBe(false)
    game = reduce(game, { t: 'bossStep' })
    expect(game.combat!.bossHand).toEqual([])
    expect(game.combat!.playerDieModifier).toBeLessThan(0)
    expect(game.phase).toBe('combat')
  })
})
