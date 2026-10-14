import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARDS, SOLO_EXCLUDED_ACTIONS } from './data'
import { canPlayAction, newGame, reduce } from './engine'
import { loadGame, saveGame } from './save'
import { OATH } from './oaths'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
afterEach(() => vi.unstubAllGlobals())
describe('solo card compatibility', () => {
  it('does not offer the Human an oath whose six-card reward it already has', () => {
    for (let seed = 1; seed < 40; seed++) {
      expect(newGame('Mage', 'Humain', seed).promptQueue[0].options.map(option => option.id)).not.toContain(OATH.burden)
    }
    expect(newGame('Mage', 'Elfe', 42).promptQueue[0].ctx.choices).toBeDefined()
  })
  it.each([...SOLO_EXCLUDED_ACTIONS])('never deals or allows the excluded Action %s', name => {
    let game = newGame('Mage', 'Humain', 42)
    expect([...game.hand, ...game.lootDeck].some(key => CARDS.find(card => card.id === key)!.name === name)).toBe(false)
    game.promptQueue = []
    game.monsterDeck.unshift(id('Fouisseur'))
    game = reduce(game, { t: 'fightMonster' })
    game.promptQueue = []
    game.hand = [id(name)]
    expect(canPlayAction(game, id(name))).toBe(false)
    expect(reduce(game, { t: 'playAction', id: id(name) }).hand).toEqual(game.hand)
  })
  it('removes obsolete Frenzy copies from ongoing saves and restores a valid Tavern selection', () => {
    const game = newGame('Mage', 'Humain', 42)
    const frenzy = CARDS.filter(card => card.name === 'Frénésie').map(card => card.id)
    game.hand.push(frenzy[0])
    game.lootDeck.push(frenzy[1] ?? frenzy[0])
    game.lootDiscard.push(frenzy[2] ?? frenzy[0])
    game.promptQueue = [{ purpose: 'tavern-give', optional: false, options: [{ id: 'tavern-back' }], ctx: { choices: [frenzy[0], id('Force')], taken: frenzy[0], remaining: 1 } }]
    const store = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value) } })
    saveGame(game)
    const loaded = loadGame()!
    expect([...loaded.hand, ...loaded.lootDeck, ...loaded.lootDiscard].some(key => frenzy.includes(key))).toBe(false)
    expect(loaded.promptQueue[0].purpose).toBe('tavern')
    expect(loaded.promptQueue[0].ctx.choices).toEqual([id('Force')])
    expect(CARDS.some(card => card.name === 'Frénésie')).toBe(true)
  })
  it('keeps useful situational cards in the solo deck', () => {
    const game = newGame('Mage', 'Humain', 42)
    const pool = [...game.hand, ...game.lootDeck]
    for (const name of ['Invocation', 'Apaiser', 'Contre-sort', 'Malchance', 'Dépossession', 'Brise-armure', 'Voie du Chasseur']) expect(pool).toContain(id(name))
  })
})
