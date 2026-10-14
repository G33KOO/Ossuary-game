import { describe, expect, it } from 'vitest'
import { ARMOR_SLOTS, CARDS, printedPower } from './data'
import { newGame, reduce } from './engine'
import { computePlayerPower } from './power'

function encounter() {
  const game = newGame('Mage', 'Humain', 42)
  game.promptQueue = []
  game.oaths = []
  game.level = 10
  game.lootDeck = []
  game.hand = CARDS.filter(card => card.type === 'Action').slice(0, 2).map(card => card.id)
  for (const slot of ARMOR_SLOTS) game.equipment.armors[slot] = CARDS.find(card => card.type === 'Armure' && card.subtype === slot && printedPower(card.id) === 1)!.id
  const strongest = CARDS.filter(card => card.type === 'Armure').sort((a, b) => printedPower(b.id) - printedPower(a.id))[0]
  game.equipment.extraArmor = { slot: strongest.subtype, id: strongest.id }
  return { game: reduce(game, { t: 'challengeBoss', bossId: CARDS.find(card => card.name === 'L’Envers')!.id }), strongest }
}

describe('The Reverse targets the strongest equipped armor', () => {
  it('selects the strongest armor automatically, including Second Skin', () => {
    const { game, strongest } = encounter()
    const prompt = game.promptQueue[0]
    expect(prompt.purpose).toBe('envers')
    expect(prompt.ctx.armor).toBe(strongest.id)
    expect(prompt.ctx.armorPower).toBe(printedPower(strongest.id))
    expect(prompt.options.map(option => option.id)).toEqual([...game.hand, 'decline'])
    expect(prompt.options.map(option => option.id)).not.toContain(strongest.id)
  })
  it('protects that armor by discarding a hand card', () => {
    const { game, strongest } = encounter()
    const power = computePlayerPower(game).total
    const discard = game.hand[0]
    const protectedGame = reduce(game, { t: 'answer', option: discard })
    expect(protectedGame.lootDiscard).toContain(discard)
    expect(protectedGame.combat!.stolenArmor).toBeNull()
    expect(protectedGame.equipment.extraArmor!.id).toBe(strongest.id)
    expect(computePlayerPower(protectedGame).total).toBe(power)
  })
  it('transfers the displayed power of the targeted armor when the player yields', () => {
    const { game, strongest } = encounter()
    const power = computePlayerPower(game).total
    const stolen = reduce(game, { t: 'answer', option: 'decline' })
    expect(stolen.combat!.stolenArmor).toBe(strongest.id)
    expect(stolen.combat!.bossBonus).toBe(printedPower(strongest.id))
    expect(computePlayerPower(stolen).total).toBe(power - printedPower(strongest.id))
  })
})
