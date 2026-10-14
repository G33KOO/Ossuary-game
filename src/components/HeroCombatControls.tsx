import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ClassName } from '../game/data'
import type { PowerBreakdown } from '../game/power'
import type { DiceRoll } from '../game/types'
import { getClassIcon } from '../utils/cardClass'
import { DiceResults } from './DiceResults'

export function HeroPower({ power, sim }: { power: PowerBreakdown; sim: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ left: 0, bottom: 0 })
  const show = () => {
    const bounds = anchor.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - Math.min(300, window.innerWidth * .8) - 12)), bottom: window.innerHeight - bounds.top + 10 })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])
  return <div className={`gb-hero-power${open ? ' is-open' : ''}`}>
    <button ref={anchor} className="gb-hero-power-button" type="button" aria-expanded={open} aria-controls="hero-power-calculation" aria-label={`${sim.yourPower} : ${power.total}. ${sim.powerDetails}`} aria-describedby={open ? "hero-power-calculation" : undefined} onPointerEnter={(event) => { if (event.pointerType === "mouse") show() }} onPointerLeave={(event) => { if (event.pointerType === "mouse") setOpen(false) }} onFocus={show} onClick={show} onBlur={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
      <span>{sim.yourPower}</span><strong aria-live="polite" key={power.total} className="gb-power-change">{power.total}</strong><span aria-hidden="true" className="gb-power-info">ⓘ</span>
    </button>
    {open ? createPortal(<div id="hero-power-calculation" className="gb-power-tooltip gb-power-tooltip-floating" role="tooltip" style={{ left: position.left, bottom: position.bottom }}>
      <strong>{sim.powerDetails}</strong>
      <dl><div><dt>{sim.levelPart}</dt><dd>{power.level}</dd></div><div><dt>{sim.equipPart}</dt><dd>{power.equipment}</dd></div><div><dt>{sim.bonusPart}</dt><dd>{power.bonus > 0 ? '+' : ''}{power.bonus}</dd></div><div><dt>{sim.diePart}</dt><dd>{power.die ?? sim.notRolled}</dd></div><div className="gb-power-total"><dt>{sim.totalPart}</dt><dd>{power.total}</dd></div></dl>
      <p>{sim.powerCalculationHint}</p>
    </div>, document.body) : null}
  </div>
}

export function ClassActive({ klass, name, effect, passive, reasons, disabled, sim, onActivate }: {
  klass: ClassName; name: string; effect: string; passive: string; reasons: string[]; disabled: boolean; sim: Record<string, string>; onActivate: () => void
}) {
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, bottom: 0, maxHeight: 500 })
  const show = () => {
    const bounds = anchor.current?.getBoundingClientRect()
    if (!bounds) return
    const width = Math.min(420, window.innerWidth * .88)
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), bottom: window.innerHeight - bounds.top + 10, maxHeight: Math.max(120, bounds.top - 24) })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])
  return <div ref={anchor} className="gb-class-active" tabIndex={disabled ? 0 : -1} aria-label={`${sim.active} · ${name}`} aria-describedby={open ? 'class-active-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }} onFocus={show} onBlur={() => setOpen(false)} onClick={() => { if (disabled) show() }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
    <button className="button" disabled={disabled} onClick={onActivate} type="button" aria-describedby={open ? 'class-active-tooltip' : undefined}><img alt="" src={getClassIcon(klass)} /><span>{sim.active} · {name}</span></button>
    {open ? createPortal(<div className="gb-active-tooltip" id="class-active-tooltip" role="tooltip" style={position}>
      <strong>{sim.active} · {name}</strong><p>{effect}</p><p className="gb-active-passive">{passive}</p>
      <div className={`gb-active-availability${disabled ? ' is-disabled' : ''}`}><strong>{disabled ? sim.activeUnavailable : sim.activeAvailable}</strong>{reasons.length ? <ul>{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</div>
    </div>, document.body) : null}
  </div>
}

export function PlayerDie({ roll, count, modifier, sides, value, rolling, disabled, reasons, possible, modifiers, sim, onRoll, prominent = false }: {
  roll?: DiceRoll; count: number; modifier?: number; sides: number; value: number | null; rolling: boolean; disabled: boolean; reasons: string[]; possible: string; modifiers: string[]; sim: Record<string, string>; onRoll: () => void; prominent?: boolean
}) {
  const ready = !disabled && !rolling && value === null
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, bottom: 0 })
  const show = () => {
    const bounds = anchor.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - Math.min(360, window.innerWidth * .88) - 12)), bottom: window.innerHeight - bounds.top + 10 })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])
  return <div ref={anchor} className={`gb-player-die-control${ready ? ' is-ready' : ''}${prominent ? ' is-prominent' : ''}`} tabIndex={disabled ? 0 : -1} aria-label={`D${sides}`} aria-describedby={open ? 'player-die-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }} onFocus={show} onBlur={() => setOpen(false)} onClick={() => { if (disabled) show() }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
    <button className="gb-player-die-button" type="button" disabled={disabled} onClick={() => { setOpen(false); onRoll() }} aria-label={sim.roll} aria-describedby={open ? 'player-die-tooltip' : undefined}><DiceResults roll={roll} count={count} modifier={modifier} sides={sides} value={value} rolling={rolling} ready={ready} compact sim={sim} />{ready ? <span className="gb-die-invitation" aria-hidden="true">{prominent ? sim.rollCombat : sim.dieInvite}</span> : null}</button>
    {open ? createPortal(<div className="gb-active-tooltip gb-die-tooltip" id="player-die-tooltip" role="tooltip" style={position}><strong>D{sides} · {sim.diePossible}</strong><p>{possible}</p><p>{sim.dieCommitment}</p>{roll ? <DiceResults roll={roll} value={value} modifier={modifier} sim={sim} /> : null}{modifiers.map((text, index) => <p className="gb-active-passive" key={index}>{text}</p>)}<div className={`gb-active-availability${disabled ? ' is-disabled' : ''}`}><strong>{disabled ? sim.dieUnavailable : sim.dieReady}</strong>{reasons.length ? <ul>{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</div></div>, document.body) : null}
  </div>
}

