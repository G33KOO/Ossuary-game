import type { GameState } from './types'

/** Keep every drawn card visible, including loot followed by a chained monster. */
export function drawPresentations(draws: GameState['draws']) {
  const frames: { kind: 'loot' | 'monster'; cards: string[] }[] = []
  for (const kind of ['loot', 'monster'] as const) {
    const cards = draws.filter((draw) => draw.kind === kind).map((draw) => draw.id)
    for (let index = 0; index < cards.length; index += 5) frames.push({ kind, cards: cards.slice(index, index + 5) })
  }
  return frames
}
