import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { canEquip, canPlayAction, newGame, reduce } from './engine'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function excess() {
  let game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []
  game.hand = ['Masse Nautile', 'Providence', 'Vœu', 'Force', 'Chance', 'Peur', 'Faiblesse', 'Cupidité'].map(id)
  game.lootDeck = game.lootDeck.filter(id => !game.hand.includes(id))
  game.endTurnPending = true
  return reduce(game, { t: 'endTurn' })
}
describe('playing cards during excess-hand preparation', () => {
  it('can reach the hand limit entirely by equipping without forcing a discard or advancing the turn', () => {
    let game = excess()
    game.hand[game.hand.indexOf(id('Force'))] = id('Gants Nervurés')
    game = reduce(game, { t: 'equip', id: id('Masse Nautile') })
    game = reduce(game, { t: 'equip', id: id('Gants Nervurés') })
    expect(game.hand).toHaveLength(6)
    expect(game.promptQueue).toEqual([])
    expect(game.turn).toBe(1)
    expect(game.endTurnRequested).toBe(false)
  })
  it('equips a card and refreshes the discard count and candidates without opening Tavern', () => {
    let game = excess()
    expect(canEquip(game, id('Masse Nautile'))).toBe(true)
    game = reduce(game, { t: 'equip', id: id('Masse Nautile') })
    expect(game.equipment.hands).toContain(id('Masse Nautile'))
    expect(game.promptQueue[0].ctx.count).toBe(1)
    expect(game.promptQueue[0].options.some(o => o.id === id('Masse Nautile'))).toBe(false)
    expect(game.endTurnRequested).toBe(false)
    expect(game.tavernDone).toBe(false)
  })
  it('refreshes the discard count after Providence draws cards', () => {
    let game = excess()
    expect(canPlayAction(game, id('Providence'))).toBe(true)
    game = reduce(game, { t: 'playAction', id: id('Providence') })
    expect(game.hand).toHaveLength(10)
    expect(game.promptQueue[0].purpose).toBe('discard-excess')
    expect(game.promptQueue[0].ctx.count).toBe(4)
    expect(game.promptQueue[0].options.map(o => o.id)).toEqual(game.hand)
    expect(game.turn).toBe(1)
  })
  it('handles an Action choice before returning to the up-to-date discard step', () => {
    let game = reduce(excess(), { t: 'playAction', id: id('Vœu') })
    expect(game.promptQueue[0].purpose).toBe('vow')
    game = reduce(game, { t: 'answer', option: game.promptQueue[0].options[0].id })
    expect(game.promptQueue[0].purpose).toBe('discard-excess')
    expect(game.promptQueue[0].ctx.count).toBe(2)
    expect(game.promptQueue[0].options.map(o => o.id)).toEqual(game.hand)
  })
  it('removes a stale discard prompt once the hand is legal but waits for explicit End turn', () => {
    let game = excess()
    game = reduce(game, { t: 'equip', id: id('Masse Nautile') })
    game = reduce(game, { t: 'answer', option: id('Force') })
    expect(game.hand).toHaveLength(6)
    expect(game.promptQueue).toEqual([])
    expect(game.endTurnPending).toBe(true)
    expect(game.turn).toBe(1)
    game = reduce(game, { t: 'endTurn' })
    expect(game.promptQueue[0].purpose).toBe('tavern')
  })
})
