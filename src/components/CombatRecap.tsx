import type { FinalCombat } from '../game/types'
import type { Locale } from '../i18n/LocaleProvider'
import { Modal } from './Modal'
import { GameCard } from './game-ui'
import { DiceResults } from './DiceResults'

export function CombatRecap({ final, locale, sim, inspect, onClose }: {
  final: FinalCombat; locale: Locale; sim: Record<string, string>
  inspect: (id: string, element: HTMLElement) => void; onClose: () => void
}) {
  return <Modal id="final-combat-title" title={sim.recapTitle} onClose={onClose} closeLabel={sim.close} className="gb-recap-modal">
    <h3>{final.outcome === 'won' ? sim.victoryTitle : sim.defeatTitle}</h3>
    <div className="gb-final-scores">{(['player', 'opponent'] as const).map((side) => <section key={side}><span>{side === 'player' ? sim.you : sim.opponent}</span><strong>{final.power[side].total}</strong><p>{sim.levelPart} {final.power[side].level} · {sim.equipPart} {final.power[side].equipment} · {sim.bonusPart} {final.power[side].bonus}</p><DiceResults roll={side === 'player' ? final.combat.playerRoll : final.combat.bossRoll} value={final.power[side].die} sides={side === 'player' ? final.combat.playerRoll?.sides : final.combat.bossSides} modifier={side === 'player' ? final.combat.playerDieModifier : final.combat.bossDieModifier} sim={sim} /></section>)}</div>
    <h3>{sim.bossPlayed}</h3>
    <div className="gb-inventory-grid">{final.combat.bossPlayedCards?.length ? final.combat.bossPlayedCards.map((id, index) => <GameCard key={`${id}-${index}`} id={id} locale={locale} size="sm" onInspect={(el) => inspect(id, el)} />) : <p>{sim.emptyCards}</p>}</div>
    <button type="button" className="button button-primary" onClick={onClose}>{sim.viewFinalBoard}</button>
  </Modal>
}
