import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { GameState } from '../game/types'
import { fill, soloCopy } from '../content/solo'
import { useLocale } from '../hooks/useLocale'
import './level-timeline.css'

function MilestoneIcon({ boss = false }: { boss?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{boss ? <><path d="M6 14a8 8 0 1 1 12 0v6H6v-6Z" /><path d="M9 20v-3m6 3v-3M8 10h2m4 0h2m-5 4h2" /></> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>}</svg>
}

export function LevelTimeline({ game }: { game: GameState }) {
  const [portalRoot, setPortalRoot] = useState<Element | null>(null)
  const { locale } = useLocale()
  const sim = soloCopy[locale].sim
  const previous = useRef(game.level)
  const [burst, setBurst] = useState<'level' | 'milestone' | null>(null)
  const [hover, setHover] = useState<{ level: number; left: number; top: number } | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = game.level
    if (game.level <= before) { setBurst(null); return }
    setBurst((before < 5 && game.level >= 5) || (before < 10 && game.level >= 10) ? 'milestone' : 'level')
    const timer = window.setTimeout(() => setBurst(null), 1800)
    return () => window.clearTimeout(timer)
  }, [game.level])
  useEffect(() => {
    if (!hover) return
    const close = () => setHover(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [hover])
  const show = (level: number, element: HTMLElement) => {
    setPortalRoot(element.closest('dialog'))
    const rect = element.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth * .88)
    setHover({ level, left: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)), top: rect.bottom + 260 < window.innerHeight ? rect.bottom + 12 : Math.max(12, rect.top - 250) })
  }
  const active = game.level >= 10
  return <div className={`gb-level-timeline${burst ? ` is-${burst}-up` : ''}`} aria-label={sim.timelineTitle}>
    <div className="gb-level-track" style={{ '--level-progress': `${(game.level - 1) / 9 * 100}%` } as CSSProperties}>
      <span className="gb-level-track-base" aria-hidden="true"><span className="gb-level-track-fill" /></span>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => <button key={level} className={`gb-level-node${level <= game.level ? ' is-reached' : ''}${level === game.level ? ' is-current' : ''}${level === 5 || level === 10 ? ' is-milestone' : ''}`} type="button" aria-current={level === game.level ? 'step' : undefined} aria-label={fill(sim.timelineNodeLabel, { level })} aria-describedby={hover?.level === level ? 'level-timeline-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show(level, event.currentTarget) }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHover(null) }} onFocus={(event) => show(level, event.currentTarget)} onBlur={() => setHover(null)} onClick={(event) => show(level, event.currentTarget)} onKeyDown={(event) => { if (event.key === 'Escape') { setHover(null); event.currentTarget.blur() } }}>
        <span className="gb-level-node-number">{level}</span>
        {level === 5 || level === 10 ? <span className="gb-level-node-caption"><MilestoneIcon boss={level === 10} />{level === 5 ? sim.timelineAwakening : sim.timelineBoss}</span> : null}
      </button>)}
      <span className="gb-timeline-live" role="status">{fill(sim.timelineCurrentLevel, { level: game.level })}</span>
    </div>
    <button className={`gb-enrage-meter${active ? ' is-active' : ''}`} type="button" aria-label={fill(sim.timelineEnrageCount, { n: game.bossPressure })} aria-describedby={hover?.level === 11 ? 'level-timeline-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show(11, event.currentTarget) }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHover(null) }} onFocus={(event) => show(11, event.currentTarget)} onBlur={() => setHover(null)} onClick={(event) => show(11, event.currentTarget)}>
      <MilestoneIcon boss /><span>{sim.timelineEnrage}<strong key={game.bossPressure}>{active || game.bossPressure ? `+${game.bossPressure}` : sim.timelineLocked}</strong></span>
    </button>
    {hover ? createPortal(<div className="gb-timeline-tooltip" id="level-timeline-tooltip" role="tooltip" style={{ left: hover.left, top: hover.top }}>
      <strong>{hover.level === 11 ? sim.timelineEnrage : `${fill(sim.timelineNodeLabel, { level: hover.level })}${hover.level === 5 ? ` · ${sim.timelineAwakening}` : hover.level === 10 ? ` · ${sim.timelineBoss}` : ''}`}</strong>
      {hover.level === 5 ? <><p>{sim.timelineLevel5}</p><ul><li className={game.strongAdded ? 'is-unlocked' : ''}>{game.strongAdded ? '✓ ' : '◇ '}{sim.timelineStrongMonsters}</li><li className={game.dieSides === 8 || game.level >= 5 ? 'is-unlocked' : ''}>{game.dieSides === 8 ? `✓ ${sim.timelineAwakened}` : `${game.level >= 5 ? '✓' : '◇'} ${sim.timelineCanAwaken}`}</li></ul></> : hover.level === 10 ? <><p>{sim.timelineLevel10}</p><ul><li className={active ? 'is-unlocked' : ''}>{active ? '✓ ' : '◇ '}{sim.timelineArtifact}</li><li className={active ? 'is-unlocked' : ''}>{active ? '✓ ' : '◇ '}{sim.timelineCanBoss}</li><li className={active ? 'is-unlocked' : ''}>{active ? '✓ ' : '◇ '}{sim.timelineEnrageRule}</li></ul></> : hover.level === 11 ? <><p>{sim.timelineEnrageRule}</p><p className="gb-timeline-enrage-count">{fill(sim.timelineBossHand, { n: 5 + game.bossPressure, extra: game.bossPressure })}</p><p>{active ? sim.timelineEnrageActive : sim.timelineEnrageInactive}</p></> : <><p>{sim.timelineLevelRule}</p><p>{hover.level === game.level ? sim.timelineCurrent : hover.level < game.level ? sim.timelinePassed : fill(sim.timelineNext, { n: hover.level - game.level })}</p></>}
    </div>, portalRoot ?? document.body) : null}
  </div>
}
