import { useEffect, useState } from 'react'
import type { DiceRoll, GameState } from '../game/types'
import type { Locale } from '../i18n/LocaleProvider'
import { card } from '../game/data'
import { localizeCard } from '../i18n/cardTranslations'
import { actionVisual } from '../game/actionVisual'
import { CardBack, GameCard } from './game-ui'
import { DiceResults } from './DiceResults'
import { useBoardFocus } from '../hooks/useBoardFocus'

export type EffectStage = { id?: string; lines: GameState['log']; seq: number }

export function EffectPresentation({ stage, locale, sim, formatLog, inspect, onNext }: {
  stage: EffectStage; locale: Locale; sim: Record<string, string>
  formatLog: (entry: GameState['log'][number]) => string
  inspect: (id: string, element: HTMLElement) => void; onNext: () => void
}) {
  const root = useBoardFocus(stage.seq)
  const params = stage.lines[0].params ?? {}
  const roll: DiceRoll | undefined = typeof params.raw === 'string' ? {
    raw: params.raw.split(',').map(Number), sides: Number(params.sides), bonus: Number(params.bonus ?? 0),
    total: Number(params.value), mode: params.mode as DiceRoll['mode'],
  } : undefined
  const hasRoll = Boolean(roll)
  const automatic = ['victory', 'merchantFavor', 'weaponHarvest'].includes(stage.lines[0].code)
  const [ready, setReady] = useState(!roll)
  useEffect(() => {
    if (!hasRoll) return
    const timer = window.setTimeout(() => setReady(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [hasRoll])
  useEffect(() => {
    if (!automatic || !ready) return
    const timer = window.setTimeout(onNext, stage.lines[0].code === 'victory' ? 200 : 1200)
    return () => window.clearTimeout(timer)
  }, [automatic, ready, onNext, stage.lines])
  const effect = stage.lines[0].code === 'bossItemDestroyed' ? 'destroy' : stage.id ? actionVisual(card(stage.id).name).effect : 'magic'
  return <section ref={root} aria-labelledby="game-effect-title" className={`gb-boss-action gb-effect-presentation gb-board-effect effect-${effect}`}>
    <h3 id="game-effect-title">{stage.lines[0].code.startsWith('boss') ? sim.bossActionTitle : sim.cardEffectTitle}</h3>
    <div className="gb-boss-action-layout">
      {stage.id ? <GameCard id={stage.id} locale={locale} onInspect={(el) => inspect(stage.id!, el)} size="lg" className="gb-boss-played-card" /> : null}
      <div className="gb-boss-action-copy" aria-live="polite">
        {roll ? <DiceResults roll={roll} rolling={!ready} sim={sim} /> : null}
        {(!roll || ready) ? stage.lines.map((entry, index) => <p className="gb-boss-action-result" key={index}>{formatLog(entry)}</p>) : <p>{sim.rolling}</p>}
        {stage.lines[0].code === 'bossDraws' ? <div className="gb-boss-drawn-cards" aria-label={formatLog(stage.lines[0])}>{Array.from({ length: Number(params.count ?? 0) }, (_, index) => <span key={index} style={{ animationDelay: `${index * 120}ms` }}><CardBack kind="loot" size="sm" /></span>)}</div> : null}
        {ready && stage.lines[0].code === 'greedRoll' ? <strong className={`gb-effect-change${Number(params.value) < 4 ? ' is-negative' : ''}`}>{Number(params.value) >= 4 ? locale === 'fr' ? 'Cupidité réussie · Butin ×2' : 'Greed succeeds · Loot ×2' : locale === 'fr' ? 'Aucun bonus de butin' : 'No loot bonus'}</strong> : null}
        {ready && params.powerChange !== undefined ? <strong className="gb-effect-change">{Number(params.powerChange) > 0 ? '+' : ''}{params.powerChange} {sim.powerPart}</strong> : null}
        {stage.lines[0].code === 'bossActive' ? <div className="gb-inventory-grid">
          {String(params.cost ?? '').split(',').filter(Boolean).map(id => <GameCard key={id} id={id} locale={locale} size="sm" onInspect={el => inspect(id, el)} className="gb-boss-played-card" />)}
          {params.target ? <GameCard id={String(params.target)} locale={locale} size="sm" onInspect={el => inspect(String(params.target), el)} /> : null}
        </div> : null}
        {params.before !== undefined ? <strong className="gb-effect-change is-negative">{sim.level} : {params.before} → {params.after}</strong> : null}
        {params.player !== undefined ? <div className="gb-final-scores"><strong>{sim.you} : {params.player}</strong><strong>{sim.opponent} : {params.opponent}</strong></div> : null}
        {stage.id ? <details className="gb-effect-rule"><summary>{sim.cardEffectTitle}</summary><p>{localizeCard(card(stage.id), locale).text}</p></details> : null}
        {stage.lines.filter((entry) => entry.code === 'playerItemDestroyed' && typeof entry.params?.card === 'string').map((entry) => <GameCard key={String(entry.params!.card)} id={String(entry.params!.card)} locale={locale} onInspect={(el) => inspect(String(entry.params!.card), el)} size="sm" />)}
        {!automatic ? <button className="button button-primary" disabled={!ready} autoFocus onClick={onNext} type="button">{sim.nextAction} →</button> : null}
      </div>
    </div>
  </section>
}
