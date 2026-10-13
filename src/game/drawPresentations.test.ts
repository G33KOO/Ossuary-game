import { expect, it } from 'vitest'
import { drawPresentations } from './drawPresentations'

it('presents all rewards before the next monster, without dropping draws beyond five cards', () => {
  const loot = Array.from({ length: 11 }, (_, index) => ({ id: `loot-${index}`, kind: 'loot' as const }))
  const monster = { id: 'chained-monster', kind: 'monster' as const }
  const frames = drawPresentations([...loot, monster])
  expect(frames.map((frame) => frame.kind)).toEqual(['loot', 'loot', 'loot', 'monster'])
  expect(frames.flatMap((frame) => frame.cards)).toEqual([...loot.map((draw) => draw.id), monster.id])
  expect(frames.every((frame) => frame.cards.length <= 5)).toBe(true)
  expect(drawPresentations([])).toEqual([])
})
