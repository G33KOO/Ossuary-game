import { useEffect, useState } from 'react'
import type { EffectStage } from './EffectPresentation'
import { fill } from '../content/solo'

export type CombatBeat = 'hero' | 'opponent' | 'vanquished' | 'result'

/** A combat verdict is a power comparison, not a separate health/damage system. */
export function CombatResolution({ stage, sim, formatLog, onBeat, onContinue }: {
  stage: EffectStage; sim: Record<string, string>
  formatLog: (entry: EffectStage['lines'][number]) => string
  onBeat: (beat: CombatBeat) => void; onContinue: () => void
}) {
  const [beat, setBeat] = useState<CombatBeat>('hero')
  const lost = stage.lines.some((line) => ['defeat', 'bossLost'].includes(line.code))
  const survives = stage.lines.some((line) => ['secondAssault', 'honorDuel'].includes(line.code))
  const monsterVictory = stage.lines.some((line) => line.code === 'victory')
  useEffect(() => {
    onBeat(beat)
    if (beat === 'result') return
    const nextBeat = beat === 'hero' ? lost ? 'opponent' : monsterVictory ? 'vanquished' : 'result' : 'result'
    const timer = window.setTimeout(() => setBeat(nextBeat), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : beat === 'vanquished' ? 800 : 1200)
    return () => window.clearTimeout(timer)
  }, [beat, lost, monsterVictory, onBeat])
  const consequence = stage.lines.slice(1).map((entry) => entry.code === 'victory' ? fill(sim.combatRewards, entry.params) : formatLog(entry)).join(' ')
  const title = beat === 'hero' ? sim.heroAttack : beat === 'opponent' ? sim.opponentAttack : beat === 'vanquished' ? sim.monsterVanquished : lost ? sim.defeatTitle : survives ? sim.opponentSurvives : sim.victoryTitle
  return <div className={`gb-combat-resolution beat-${beat}${lost ? ' is-defeat' : ''}`} aria-live="polite" data-beat={beat}>
    <div className="gb-resolution-emblem" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 39 35 13 39 5 31 9 5 35M9 27l12 12M9 39l-4 4M39 39 13 13 9 5 17 9 43 35M27 39l12-12M39 39l4 4" /></svg></div>
    <div className="gb-resolution-copy"><strong key={beat}>{title}</strong><p>{beat === 'result' ? consequence || sim.combatFinished : beat === 'hero' ? sim.heroAttackHint : beat === 'vanquished' ? sim.monsterVanquishedHint : sim.opponentAttackHint}</p></div>
    <div className="gb-resolution-values"><span>{sim.you}<b>{stage.lines[0].params?.player}</b></span><span>{sim.opponent}<b>{stage.lines[0].params?.opponent}</b></span></div>
    <button className="button button-primary" disabled={beat !== 'result'} type="button" onClick={onContinue}>{beat === 'result' ? sim.nextAction : sim.resolving}</button>
  </div>
}
