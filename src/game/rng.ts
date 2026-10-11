// mulberry32: tiny seeded generator so runs are reproducible and serializable.
export function nextRandom(holder: { seed: number }) {
  holder.seed = (holder.seed + 0x6d2b79f5) | 0
  let t = holder.seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randomInt(holder: { seed: number }, sides: number) {
  return Math.floor(nextRandom(holder) * sides) + 1
}

export function shuffle<T>(holder: { seed: number }, items: T[]) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(nextRandom(holder) * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
