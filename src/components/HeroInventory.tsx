import type { GameState } from '../game/types'
import type { Locale } from '../i18n/LocaleProvider'
import type { ReactNode } from 'react'
import { CARDS } from '../game/data'
import { equipmentCardPower } from '../game/power'
import { Modal } from './Modal'
import { GameCard } from './game-ui'

export function HeroInventory({ game, locale, sim, inspect, actions, onClose }: {
  game: GameState; locale: Locale; sim: Record<string, string>
  inspect: (id: string, element: HTMLElement) => void; onClose: () => void
  actions: (id: string) => ReactNode
}) {
  const equipped = [...Object.values(game.equipment.armors), ...game.equipment.hands, game.equipment.artifact, game.equipment.extraArmor?.id].filter((id): id is string => Boolean(id))
  const native = [...CARDS.filter((entry) => (entry.type === 'Classe' && entry.name === game.klass) || (entry.type === 'Race' && entry.name === game.race)).map((entry) => entry.id), ...(game.oaths ?? []), ...(game.retainedMonsters ?? [])]
  return <Modal id="hero-inventory-title" title={sim.inventoryTitle} onClose={onClose} closeLabel={sim.close} className="gb-inventory-modal">
    {[[sim.handDock, game.hand], [sim.equipment, [...new Set(equipped)]], [sim.yourHero, native]].map(([title, ids]) => <section key={title as string}>
      <h3>{title}</h3><div className="gb-inventory-grid">{(ids as string[]).map((id, index) => <GameCard key={`${id}-${index}`} id={id} locale={locale} size="sm" playerClass={game.klass} mobileActions={actions(id)} equipmentPower={equipped.includes(id) ? equipmentCardPower(game, id) : undefined} onInspect={(el) => inspect(id, el)} />)}</div>
    </section>)}
  </Modal>
}
