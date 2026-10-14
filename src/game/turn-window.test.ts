import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { canEquip, canPlayAction, newGame, reduce } from './engine'
import { computePlayerPower } from './power'

const id = (name: string) => CARDS.find((entry) => entry.name === name)!.id
function ready() {
  const game = newGame('Guerrier', 'Humain', 42)
  game.promptQueue = []
  game.oaths = []
  game.hand = [id('Trouvaille'), CARDS.find((entry) => entry.type === 'Armure')!.id]
  return game
}

describe('manual turn preparation', () => {
  it('discards excess cards before drawing Tavern offers and opening exchanges', () => {
    let game = ready()
    game.hand = CARDS.filter((entry) => entry.type === 'Action').slice(0, 8).map((entry) => entry.id)
    game.endTurnPending = true
    const deck = [...game.lootDeck]
    const discarded = game.hand.slice(0, 2)
    game = reduce(game, { t: 'endTurn' })
    expect(game.promptQueue[0].purpose).toBe('discard-excess')
    expect(game.promptQueue[0].ctx.count).toBe(2)
    expect(game.tavernDone).toBe(false)
    expect(game.lootDeck).toEqual(deck)
    game = reduce(game, { t: 'answer', option: discarded[0] })
    expect(game.promptQueue[0].purpose).toBe('discard-excess')
    expect(game.promptQueue[0].ctx.count).toBe(1)
    expect(game.lootDeck).toEqual(deck)
    game = reduce(game, { t: 'answer', option: discarded[1] })
    expect(game.hand).toHaveLength(6)
    expect(game.promptQueue[0].purpose).toBe('tavern')
    expect(game.turn).toBe(1)
    game = reduce(game, { t: 'answer', option: game.promptQueue[0].options[0].id })
    expect(game.promptQueue[0].purpose).toBe('tavern-give')
    expect(game.promptQueue[0].options.some((option) => discarded.includes(option.id))).toBe(false)
    game = reduce(game, { t: 'answer', option: game.hand[0] })
    expect(game.promptQueue).toEqual([])
    expect(game.turn).toBe(2)
  })
  it('does not add another discard step after playing a draw Action in the Tavern', () => {
    let game = ready()
    game.hand = [id('Trouvaille'), ...CARDS.filter((entry) => entry.type === 'Armure').slice(0, 5).map((entry) => entry.id)]
    game.endTurnPending = true
    game = reduce(game, { t: 'endTurn' })
    expect(game.promptQueue[0].purpose).toBe('tavern')
    game = reduce(game, { t: 'playAction', id: id('Trouvaille') })
    expect(game.hand).toHaveLength(7)
    game = reduce(game, { t: 'answer', option: null })
    expect(game.promptQueue).toEqual([])
    expect(game.turn).toBe(2)
    expect(game.hand).toHaveLength(7)
  })
  it('keeps victory on the same turn and permits drawing and equipping before Tavern', () => {
    let game = ready()
    game.monsterDeck = [id('Tranchebec')]
    game = reduce(game, { t: 'fightMonster' })
    game.combat!.playerBonus = 100
    game = reduce(game, { t: 'resolve' })
    expect(game.combat).toBeNull()
    expect(game.endTurnPending).toBe(true)
    expect(game.turn).toBe(1)
    expect(game.promptQueue).toEqual([])
    const count = game.hand.length
    game = reduce(game, { t: 'playAction', id: id('Trouvaille') })
    expect(game.hand).toHaveLength(count + 1)
    const armor = game.hand.find((cardId) => canEquip(game, cardId))!
    game = reduce(game, { t: 'equip', id: armor })
    expect(game.hand).not.toContain(armor)
    expect(game.turn).toBe(1)
    expect(reduce(game, { t: 'fightMonster' }).combat).toBeNull()
    expect(reduce(game, { t: 'drawLoot' }).hand).toEqual(game.hand)
    game = reduce(game, { t: 'endTurn' })
    expect(game.promptQueue[0].purpose).toBe('tavern')
    game = reduce(game, { t: 'answer', option: null })
    expect(game.turn).toBe(2)
    expect(game.endTurnPending).toBe(false)
  })

  it('changes combat power after rolling without allowing combat to end prematurely', () => {
    let game = ready()
    game.monsterDeck = [id('Tranchebec')]
    game = reduce(game, { t: 'fightMonster' })
    game = reduce(game, { t: 'roll' })
    const before = computePlayerPower(game).total
    const armor = game.hand[1]
    game = reduce(game, { t: 'equip', id: armor })
    expect(computePlayerPower(game).total).toBeGreaterThan(before)
    expect(reduce(game, { t: 'endTurn' }).combat).toEqual(game.combat)
  })

  it('reserves the next adventure until manual end even after Loot or escape', () => {
    let game = reduce(ready(), { t: 'drawLoot' })
    expect(game.promptQueue).toEqual([])
    expect(game.turn).toBe(1)
    expect(canPlayAction(game, id('Trouvaille'))).toBe(true)
    game = ready()
    game.race = 'Vesskar'
    game.monsterDeck = [id('Tranchebec')]
    game = reduce(reduce(game, { t: 'fightMonster' }), { t: 'flee' })
    expect(game.turn).toBe(1)
    expect(game.endTurnPending).toBe(true)
    expect(game.promptQueue).toEqual([])
  })

  it('preserves Tavern offers and refreshes exchange options after equipping or playing', () => {
    let game = reduce(reduce(ready(), { t: 'drawLoot' }), { t: 'endTurn' })
    const offer = game.promptQueue[0].options[0].id
    game = reduce(game, { t: 'answer', option: offer })
    const choices = game.promptQueue[0].ctx.choices
    const armor = game.hand[1]
    game = reduce(game, { t: 'equip', id: armor })
    expect(game.turn).toBe(1)
    expect(game.promptQueue[0].ctx.choices).toEqual(choices)
    expect(game.promptQueue[0].options.map((option) => option.id)).not.toContain(armor)
    game = reduce(game, { t: 'playAction', id: id('Trouvaille') })
    expect(game.promptQueue[0].purpose).toBe('tavern-give')
    expect(game.promptQueue[0].options.map((option) => option.id)).toEqual([...game.hand, 'tavern-back'])
    game = reduce(game, { t: 'answer', option: game.hand[0] })
    expect(game.hand).toContain(offer)
    expect(game.turn).toBe(2)
  })

  it('does not give a free Tavern card when all remaining hand cards were equipped', () => {
    let game = ready()
    game.hand = [game.hand[1]]
    game.endTurnPending = true
    game = reduce(game, { t: 'endTurn' })
    const armor = game.hand[0]
    game = reduce(game, { t: 'equip', id: armor })
    const offer = game.promptQueue[0].options[0].id
    expect(reduce(game, { t: 'answer', option: offer }).hand).toEqual([])
    expect(game.promptQueue[0].purpose).toBe('tavern')
    game = reduce(game, { t: 'answer', option: null })
    expect(game.turn).toBe(2)
  })

  it('keeps a preparation window after defeat and protects mandatory effect decisions', () => {
    let game = ready()
    game.level = 4
    game.monsterDeck = [id('Tranchebec')]
    game = reduce(game, { t: 'fightMonster' })
    game.combat!.monsterBonus = 100
    game = reduce(game, { t: 'resolve' })
    expect(game.stats.defeats).toBe(1)
    expect(game.level).toBe(3)
    expect(game.turn).toBe(1)
    expect(game.endTurnPending).toBe(true)
    expect(game.promptQueue).toEqual([])
    game.promptQueue = [{ purpose: 'pay', optional: false, options: [{ id: game.hand[0] }], ctx: { n: 1, paid: [] } }]
    expect(canEquip(game, game.hand[1])).toBe(false)
    expect(canPlayAction(game, game.hand[0])).toBe(false)
    expect(reduce(game, { t: 'endTurn' }).endTurnRequested).toBe(false)
  })
})
