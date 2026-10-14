import type { GameState } from './types'
import { retireWeakMonsters } from './engine'
import { CARDS, SOLO_EXCLUDED_ACTIONS } from './data'
import { handLimit } from './power'
import { availableSoloOaths } from './oaths'
import { shuffle } from './rng'

const KEY = 'ossuaire.solo.v1'
const MAX_LOG = 60

type Saved = { v: 1; game: GameState }

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Saved
    const game = data?.game
    if (data?.v !== 1 || !game || !Array.isArray(game.hand) || !Array.isArray(game.lootDeck) || !game.equipment) return null
    if ((game.phase === 'won' || game.phase === 'lost') && !game.finalCombat) return null
    const resumed: GameState = { ...game, endTurnRequested: game.endTurnRequested ?? (game.endTurnPending && game.tavernDone), draws: [] }
    if (!resumed.counterspellsEnabled && resumed.phase !== 'won' && resumed.phase !== 'lost') {
      const present = new Set([...resumed.hand, ...resumed.lootDeck, ...resumed.lootDiscard, ...(resumed.combat?.bossHand ?? []), ...resumed.promptQueue.flatMap(prompt => prompt.options.map(option => option.cardId ?? option.id))])
      const missing = CARDS.filter(card => card.name === 'Contre-sort' && !present.has(card.id)).map(card => card.id)
      resumed.lootDeck = shuffle(resumed, [...resumed.lootDeck, ...missing])
      resumed.counterspellsEnabled = true
    }
    retireWeakMonsters(resumed)
    if (resumed.phase !== 'won' && resumed.phase !== 'lost') {
      const excluded = new Set(CARDS.filter(card => card.type === 'Action' && SOLO_EXCLUDED_ACTIONS.has(card.name)).map(card => card.id))
      const allowed = (id: string) => !excluded.has(id)
      resumed.hand = resumed.hand.filter(allowed)
      resumed.lootDeck = resumed.lootDeck.filter(allowed)
      resumed.lootDiscard = resumed.lootDiscard.filter(allowed)
      if (resumed.combat) resumed.combat.bossHand = resumed.combat.bossHand.filter(allowed)
      resumed.promptQueue = resumed.promptQueue.flatMap(prompt => {
        prompt.options = prompt.options.filter(option => allowed(option.cardId ?? option.id))
        if (Array.isArray(prompt.ctx.choices)) prompt.ctx.choices = prompt.ctx.choices.filter(allowed)
        if (prompt.purpose === 'oath') {
          const available = availableSoloOaths(resumed.race)
          prompt.options = prompt.options.filter(option => available.includes(option.id))
          if (Array.isArray(prompt.ctx.choices)) prompt.ctx.choices = prompt.ctx.choices.filter(id => available.includes(id))
        }
        if (prompt.purpose === 'tavern-give' && !allowed(String(prompt.ctx.taken))) {
          prompt.purpose = 'tavern'
          prompt.optional = true
          prompt.options = (prompt.ctx.choices as string[]).map(id => ({ id, cardId: id }))
          delete prompt.ctx.taken
        }
        if (prompt.purpose === 'discard-excess') {
          if (resumed.hand.length <= handLimit(resumed)) return []
          prompt.options = resumed.hand.map(id => ({ id, cardId: id }))
          prompt.ctx.count = resumed.hand.length - handLimit(resumed)
        }
        return prompt.options.length || prompt.optional ? [prompt] : []
      })
    }
    return resumed
  } catch {
    return null
  }
}

export function saveGame(game: GameState | null) {
  try {
    if (!game) {
      window.localStorage.removeItem(KEY)
      return
    }
    // Transient animation data is not persisted and the log is trimmed to keep the payload small.
    const slim: GameState = { ...game, draws: [], log: game.log.slice(-MAX_LOG) }
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, game: slim } satisfies Saved))
  } catch {
    // Storage full or unavailable: the game simply stays non-resumable.
  }
}
