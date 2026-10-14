import { describe, expect, it, vi } from 'vitest'
import { CARDS, printedPower } from './data'
import { newGame, reduce } from './engine'
import { loadGame } from './save'

const id = (name: string) => CARDS.find((entry) => entry.name === name)!.id
const weak = (cardId: string) => [4, 6, 7].includes(printedPower(cardId))
function levelFour() {
  const game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []; game.oaths = []; game.level = 4
  return game
}

describe('Danger + at level five', () => {
  it('updates the Monster deck of an existing save that already unlocked Danger +', () => {
    const game = levelFour()
    game.level = 5; game.strongAdded = true
    const weakIds = game.monsterDeck.filter(weak)
    vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify({ v: 1, game }) } })
    try {
      const resumed = loadGame()!
      expect(resumed.monsterDeck.some(weak)).toBe(false)
      expect([...resumed.removedMonsters!].sort()).toEqual([...weakIds].sort())
      expect(resumed.level).toBe(5)
    } finally { vi.unstubAllGlobals() }
  })
  it('preserves a Sème-Peste rematch without duplicating a retired card', () => {
    let game = levelFour()
    game.race = 'Vesskar'
    const pest = id('Sème-Peste')
    game.monsterDeck = [pest, ...game.monsterDeck.filter((cardId) => cardId !== pest)]
    game = reduce(reduce(game, { t: 'fightMonster' }), { t: 'flee' })
    game.hand = [id('Renoncement')]
    game = reduce(game, { t: 'playAction', id: game.hand[0] })
    expect(game.removedMonsters).toContain(pest)
    game = reduce(game, { t: 'endTurn' })
    expect(game.combat!.monsters).toEqual([pest])
    expect(game.combat!.flags).toContain('pest-retry')
    expect(game.removedMonsters).not.toContain(pest)
    expect(game.monsterDeck.some(weak)).toBe(false)
  })
  it('adds strong Monsters and retires only Power 4, 6 and 7 Monsters', () => {
    let game = levelFour()
    const removed = game.monsterDeck.filter(weak)
    const kept = game.monsterDeck.filter((cardId) => !weak(cardId))
    const strong = [...game.strongMonsters]
    game.hand = [id('Renoncement')]
    game = reduce(game, { t: 'playAction', id: game.hand[0] })
    expect(game.level).toBe(5)
    expect(game.strongAdded).toBe(true)
    expect(game.monsterDeck.some(weak)).toBe(false)
    expect([...game.removedMonsters!].sort()).toEqual([...removed].sort())
    expect([...game.monsterDeck].sort()).toEqual([...kept, ...strong].sort())
    expect(game.monsterDeck.length + game.removedMonsters!.length).toBe(66)
  })
  it('applies Danger + after victory without interrupting the current Monster', () => {
    let game = levelFour()
    game.monsterDeck = [id('Tranchebec'), ...game.monsterDeck.filter((cardId) => cardId !== id('Tranchebec'))]
    game = reduce(game, { t: 'fightMonster' })
    expect(game.combat!.monsters).toContain(id('Tranchebec'))
    expect(game.strongAdded).toBe(false)
    game.combat!.playerBonus = 100
    game = reduce(game, { t: 'resolve' })
    expect(game.level).toBe(5)
    expect(game.monsterDeck.some(weak)).toBe(false)
    expect(game.monsterDiscard).toContain(id('Tranchebec'))
    expect(game.stats.monsters).toBe(1)
  })
  it('does not recycle retired ranks from the discard, even after dropping below level five', () => {
    let game = levelFour()
    game.strongAdded = true
    game.level = 3
    const survivor = CARDS.find((entry) => entry.type === 'Monstre' && Number(entry.value) === 9)!.id
    const retired = CARDS.filter((entry) => entry.type === 'Monstre' && weak(entry.id)).slice(0, 3).map((entry) => entry.id)
    game.monsterDeck = []
    game.monsterDiscard = [...retired, survivor]
    game = reduce(game, { t: 'fightMonster' })
    expect(game.combat!.monsters).toEqual([survivor])
    expect([...game.removedMonsters!].sort()).toEqual([...retired].sort())
    expect(game.monsterDiscard).toEqual([])
  })
  it('does not remove low-power Monsters before the milestone or add the strong pool twice', () => {
    let game = levelFour()
    expect(game.monsterDeck.some(weak)).toBe(true)
    game.hand = [id('Renoncement')]
    game = reduce(game, { t: 'playAction', id: game.hand[0] })
    const deck = [...game.monsterDeck]
    const removed = [...game.removedMonsters!]
    game.hand = [id('Renoncement')]
    game = reduce(game, { t: 'playAction', id: game.hand[0] })
    expect(game.monsterDeck).toEqual(deck)
    expect(game.removedMonsters).toEqual(removed)
    expect(game.log.filter((entry) => entry.code === 'strongMonsters')).toHaveLength(1)
  })
})
