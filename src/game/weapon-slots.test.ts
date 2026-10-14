import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { newGame, reduce } from './engine'
import { weaponSlots } from './weaponSlots'

const single = CARDS.filter(card => card.type === 'Arme' && card.subtype !== 'Deux mains').slice(0, 3).map(card => card.id)
const twoHanded = CARDS.find(card => card.type === 'Arme' && card.subtype === 'Deux mains')!.id
function ready() {
  const game = newGame('Guerrier', 'Humain', 42)
  game.promptQueue = []
  game.oaths = []
  game.equipment.hands = single.slice(0, 2)
  game.hand = [single[2], twoHanded]
  return game
}

describe('targeted weapon slots', () => {
  it.each([0, 1] as const)('replaces only the weapon in targeted slot %s', hand => {
    const game = ready()
    const equipped = reduce(game, { t: 'equip', id: single[2], hand })
    const slots = weaponSlots(equipped.equipment)
    expect(slots[hand]).toBe(single[2])
    expect(slots[hand === 0 ? 1 : 0]).toBe(single[hand === 0 ? 1 : 0])
    expect(equipped.hand).toContain(single[hand])
    expect(equipped.hand).not.toContain(single[2])
  })

  it('keeps an offhand weapon in slot 2 across serialization and fills the empty slot 1', () => {
    const game = ready()
    game.equipment.hands = []
    const equipped = reduce(game, { t: 'equip', id: single[2], hand: 1 })
    const resumed = JSON.parse(JSON.stringify(equipped))
    expect(weaponSlots(resumed.equipment)).toEqual([null, single[2]])
    resumed.hand.push(single[0])
    const filled = reduce(resumed, { t: 'equip', id: single[0] })
    expect(weaponSlots(filled.equipment)).toEqual([single[0], single[2]])
  })

  it('does not move slot 2 into slot 1 when unequipping slot 1', () => {
    const game = reduce(ready(), { t: 'unequip', id: single[0] })
    expect(weaponSlots(game.equipment)).toEqual([null, single[1]])
  })

  it.each([0, 1] as const)('equips a two-handed weapon from target %s without duplicating it', hand => {
    const equipped = reduce(ready(), { t: 'equip', id: twoHanded, hand })
    expect(weaponSlots(equipped.equipment)).toEqual([twoHanded, twoHanded])
    expect(equipped.equipment.hands).toEqual([twoHanded])
    expect(equipped.hand).toEqual(expect.arrayContaining(single))
  })

  it.each([0, 1] as const)('replaces a two-handed weapon with a single weapon in target %s', hand => {
    let game = reduce(ready(), { t: 'equip', id: twoHanded })
    game = reduce(game, { t: 'equip', id: single[2], hand })
    expect(weaponSlots(game.equipment)).toEqual(hand === 0 ? [single[2], null] : [null, single[2]])
    expect(game.hand.filter(id => id === twoHanded)).toHaveLength(1)
  })
})
