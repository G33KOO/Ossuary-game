import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { newGame, reduce } from './engine'
import { handLimit } from './power'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function preparation(tavernDone = false) {
  const game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []
  game.oaths = []
  game.hand = [id('Trouvaille'), ...CARDS.filter(card => card.type === 'Action' && card.name !== 'Trouvaille').slice(0, 5).map(card => card.id)]
  game.endTurnPending = true
  game.endTurnRequested = true
  game.tavernDone = tavernDone
  return game
}

describe('manual preparation after managing the hand', () => {
  it.each([false, true])('keeps preparation open after drawing with an action (tavern done: %s)', tavernDone => {
    const game = preparation(tavernDone)
    const played = reduce(game, { t: 'playAction', id: id('Trouvaille') })
    expect(played.turn).toBe(game.turn)
    expect(played.endTurnPending).toBe(true)
    expect(played.endTurnRequested).toBe(false)
    expect(played.promptQueue).toEqual([])
    expect(played.hand.length).toBeGreaterThan(handLimit(played))
    const ended = reduce(played, { t: 'endTurn' })
    expect(ended.turn).toBe(game.turn)
    expect(ended.promptQueue[0]?.purpose).toBe('discard-excess')
  })

  it('rechecks excess after an action played in the Tavern without advancing on exit', () => {
    const game = preparation(true)
    const choices = game.lootDeck.splice(0, 3)
    game.promptQueue = [{ purpose: 'tavern', options: choices.map(id => ({ id, cardId: id })), optional: true, ctx: { choices, remaining: 1 } }]
    const played = reduce(game, { t: 'playAction', id: id('Trouvaille') })
    expect(played.promptQueue[0]?.purpose).toBe('tavern')
    const exited = reduce(played, { t: 'answer', option: null })
    expect(exited.turn).toBe(game.turn)
    expect(exited.endTurnPending).toBe(true)
    expect(exited.promptQueue).toEqual([])
    const ended = reduce(exited, { t: 'endTurn' })
    expect(ended.promptQueue[0]?.purpose).toBe('discard-excess')
    const discarded = reduce(ended, { t: 'answer', option: ended.hand[0] })
    expect(discarded.turn).toBe(game.turn + 1)
    expect(discarded.hand.length).toBeLessThanOrEqual(handLimit(discarded))
  })
})
