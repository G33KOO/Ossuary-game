import { describe, expect, it } from 'vitest'
import { CARDS } from './data'
import { activeStatus, BOSS_IDS, newGame, reduce } from './engine'
import { weaponSlots } from './weaponSlots'

const id = (name: string) => CARDS.find(card => card.name === name)!.id
function battle() {
  let game = newGame('Voleur', 'Humain', 42)
  game.level = 10
  game.promptQueue = []
  game = reduce(game, { t: 'challengeBoss', bossId: BOSS_IDS[0] })
  game.promptQueue = []
  game.hand = ['Force', 'Chance'].map(id)
  game.equipment.hands = [id('Masse Nautile')]
  game.combat!.bossEquip = [id('Dague Veuve')]
  game.combat!.bossHand = []
  return game
}
function paid(game: ReturnType<typeof battle>) {
  game = reduce(game, { t: 'useActive' })
  for (let i = 0; i < 2; i++) game = reduce(game, { t: 'answer', option: game.promptQueue[0].options[0].id })
  return game
}
describe('Thief active against the Boss', () => {
  it.each([false, true])('pays and exchanges actual equipment before or after rolling (%s)', rolled => {
    let game = battle()
    if (rolled) game = reduce(game, { t: 'roll' })
    expect(activeStatus(game).available).toBe(true)
    game = paid(game)
    expect(game.promptQueue[0].purpose).toBe('thief-boss-pick')
    game = reduce(game, { t: 'answer', option: id('Dague Veuve') })
    expect(game.promptQueue[0].purpose).toBe('thief-hero-pick')
    game = reduce(game, { t: 'answer', option: id('Masse Nautile') })
    expect(game.equipment.hands).toEqual([id('Dague Veuve')])
    expect(game.combat!.bossEquip).toEqual([id('Masse Nautile')])
    expect(game.hand).toEqual([])
    expect(game.log.at(-1)?.code).toBe('thiefSwap')
    expect(activeStatus(game).reasons.some(reason => reason.code === 'used-turn')).toBe(true)
  })
  it('preserves both physical hand slots for a two-handed exchange', () => {
    let game = battle()
    game.equipment.hands = [id('Brise-Fer à deux mains')]
    game.combat!.bossEquip = [id('Faux du Trépas à deux mains')]
    game = paid(game)
    game = reduce(game, { t: 'answer', option: game.combat!.bossEquip[0] })
    game = reduce(game, { t: 'answer', option: game.equipment.hands[0] })
    expect(weaponSlots(game.equipment)).toEqual([id('Faux du Trépas à deux mains'), id('Faux du Trépas à deux mains')])
    expect(game.combat!.bossEquip).toEqual([id('Brise-Fer à deux mains')])
  })
  it('blocks the active when no matching equipment exists without charging a cost', () => {
    const game = battle()
    game.combat!.bossEquip = [id('Brise-Fer à deux mains')]
    expect(activeStatus(game).reasons.some(reason => reason.code === 'equipment-match')).toBe(true)
    expect(reduce(game, { t: 'useActive' }).hand).toEqual(game.hand)
  })
  it('exchanges the matching armor slot without touching other equipment', () => {
    let game = battle()
    const strong = CARDS.find(c => c.type === 'Armure' && c.subtype === 'Gants' && Number.parseInt(c.value) > 1)!.id
    game.equipment.armors.Gants = id('Gants Nervurés')
    game.combat!.bossEquip = [strong]
    const weapon = game.equipment.hands[0]
    game = paid(game)
    game = reduce(game, { t: 'answer', option: strong })
    game = reduce(game, { t: 'answer', option: id('Gants Nervurés') })
    expect(game.equipment.armors.Gants).toBe(strong)
    expect(game.combat!.bossEquip).toEqual([id('Gants Nervurés')])
    expect(game.equipment.hands).toEqual([weapon])
  })
  it('charges one card with the Thief artifact', () => {
    let game = battle()
    game.equipment.artifact = CARDS.find(c => c.type === 'Artefact de classe' && c.requirement?.includes('Classe : Voleur'))!.id
    game = reduce(game, { t: 'useActive' })
    game = reduce(game, { t: 'answer', option: game.hand[0] })
    expect(game.hand).toHaveLength(1)
    expect(game.promptQueue[0].purpose).toBe('thief-boss-pick')
  })
})
