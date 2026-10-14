import { CLASS_NAMES, RACE_NAMES } from './data'
import { newGame, reduce } from './engine'

export function randomHero(random = Math.random) {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
  let game = newGame(pick(CLASS_NAMES), pick(RACE_NAMES), Math.floor(random() * 2 ** 31))
  // Use the actual offered oaths and preserve the Revenant's two-oath rule.
  while (game.promptQueue[0]?.purpose === 'oath') {
    game = reduce(game, { t: 'answer', option: pick(game.promptQueue[0].options).id })
  }
  return game
}
