import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, DragEvent, ReactNode } from 'react'
import { fill, soloCopy } from '../content/solo'
import { ARMOR_SLOTS, CARDS, CLASS_NAMES, RACE_NAMES, card } from '../game/data'
import type { ClassName, RaceName } from '../game/data'
import { BOSS_IDS, activeStatus, canChangeEquipment, canEquip, canPlayAction, fleeBlocked, newGame, reduce } from '../game/engine'
import { loadGame, saveGame } from '../game/save'
import { computePlayerPower, computePower, equipmentCardPower, handLimit, isMasteredWeapon } from '../game/power'
import type { PowerBreakdown } from '../game/power'
import type { GameAction, GameState, Prompt } from '../game/types'
import { useCardDialog } from '../hooks/useCardDialog'
import { localizeCard } from '../i18n/cardTranslations'
import type { Locale } from '../i18n/LocaleProvider'
import { useLocale } from '../i18n/LocaleProvider'
import { getCardIllustration, hasFemaleVariant } from '../utils/cardIllustration'
import type { CardGender } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import { getCardClass, getClassIcon } from '../utils/cardClass'
import { OATH, oathCompleted } from '../game/oaths'
import { permanentDieBonus } from '../game/oaths'
import { ModalHeader } from './ModalHeader'
import { LevelTimeline } from './LevelTimeline'
import { actionVisual } from '../game/actionVisual'
import type { ActionEffect, ActionTarget } from '../game/actionVisual'
import '../styles/solo-board.css'
import '../styles/immersion.css'
import '../styles/solo-mobile.css'

const ROLL_DELAY = 1100
const RESOLVE_DELAY = 1300
const REVEAL_BASE = 1900
const REVEAL_STAGGER = 250

type Busy = 'rolling' | 'resolving' | 'boss' | null
type Drag = { id: string; from: 'hand' | 'equip' }
type Reveal = { seq: number; kind: 'loot' | 'monster'; cards: string[] }
type BossPresentation = { id?: string; lines: GameState['log']; seq: number }
type PlayedAction = { id: string; effect: ActionEffect; target: ActionTarget; seq: number; x: number; y: number; dx: number; dy: number; result: string; lines: GameState['log']; destroyed?: { id: string; x: number; y: number } }

const TYPE_ICON: Record<string, string> = {
  Arme: '⚔',
  Armure: '⬡',
  Action: '✧',
  Monstre: '☠',
  Boss: '♜',
  'Artefact de classe': '✦',
}

function heroCard(type: 'Classe' | 'Race', name: string) {
  return CARDS.find((entry) => entry.type === type && entry.name === name)
}

function slotAccepts(slot: string, id: string) {
  const entry = card(id)
  if (entry.type === 'Armure') return entry.subtype === slot
  if (entry.type === 'Arme') return slot.startsWith('hand')
  if (entry.type === 'Artefact de classe') return slot === 'artifact'
  return false
}

type GameCardProps = {
  mobileActions?: ReactNode
  decorative?: boolean
  allWeaponMastery?: boolean
  equipmentPower?: number
  playerClass?: ClassName
  id: string
  locale: Locale
  size?: 'sm' | 'md' | 'lg' | 'hand'
  onInspect: (element: HTMLElement) => void
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  actions?: ReactNode
  style?: CSSProperties
  className?: string
}

function GameCard({
  mobileActions,
  decorative = false,
  allWeaponMastery = false,
  equipmentPower,
  playerClass,
  id,
  locale,
  size = 'md',
  onInspect,
  draggable,
  onDragStart,
  onDragEnd,
  actions,
  style,
  className = '',
}: GameCardProps) {
  const entry = card(id)
  const localized = localizeCard(entry, locale)
  const art = getCardIllustration(entry)
  const cardClass = getCardClass(entry)
  const mastered = (playerClass ? isMasteredWeapon(entry, playerClass) : false) || (allWeaponMastery && entry.type === 'Arme')
  const masteryLabel = locale === 'fr' ? 'Maîtrisée · Puissance doublée' : 'Mastered · Double power'
  const boosted = equipmentPower !== undefined && equipmentPower > (Number.parseInt(entry.value, 10) || 0)
  const powerLabel = boosted ? (locale === 'fr' ? `Puissance augmentée : ${entry.value} → ${equipmentPower}` : `Boosted power: ${entry.value} → ${equipmentPower}`) : ''
  return (
    <div
      className={`gb-card-wrap size-${size} ${className}${mastered ? ' is-mastered' : ''}`}
      data-card-id={id}
      aria-hidden={decorative || undefined}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      style={style}
    >
      <button
        className={`gb-card type-${slugify(entry.type)}`}
        onClick={(event) => onInspect(event.currentTarget)}
        title={`${localized.name}${mastered ? ` · ${masteryLabel}` : ''}`}
        aria-label={`${localized.name}${mastered ? ` · ${masteryLabel}` : ''}${boosted ? ` · ${powerLabel}` : ''}`}
        type="button"
        tabIndex={decorative ? -1 : undefined}
      >
        <span aria-hidden="true" className="gb-art">
          {art ? <img alt="" draggable={false} loading="lazy" src={art.src} /> : <span>{TYPE_ICON[entry.type] ?? '✦'}</span>}
        </span>
        {cardClass ? <span className="gb-class-icon" title={cardClass} aria-hidden="true"><img alt="" src={getClassIcon(cardClass)} /></span> : null}
        {mastered ? <span className="gb-mastery-label" aria-hidden="true">{locale === 'fr' ? 'Maîtrisée' : 'Mastered'}</span> : null}
        {entry.value ? <span className={`gb-orb${boosted ? ' is-boosted' : ''}`} title={powerLabel || undefined} key={`power-${equipmentPower ?? entry.value}`}>{equipmentPower ?? entry.value}</span> : null}
        <span className="gb-name">{localized.name}</span>
      </button>
      {actions ? <div className="gb-card-actions">{actions}</div> : null}
      {mobileActions ? <div className="gb-mobile-card-actions">{mobileActions}</div> : null}
    </div>
  )
}

function CardBack({ kind, size = 'md', actionLabel }: { kind: 'loot' | 'monster' | 'boss'; size?: 'sm' | 'md' | 'lg'; actionLabel?: string }) {
  return (
    <span aria-hidden="true" className={`gb-back kind-${kind} size-${size}`}>
      <span>{kind === 'loot' ? '✦' : kind === 'monster' ? '☠' : '♜'}</span>
      {actionLabel ? <span className="gb-pile-action"><span className="gb-pile-action-label">{actionLabel}</span></span> : null}
    </span>
  )
}

function Pile({
  kind,
  count,
  label,
  hint,
  onClick,
  disabled,
  actionLabel,
}: {
  kind: 'loot' | 'monster' | 'boss'
  count: number
  label: string
  hint?: string
  onClick?: () => void
  disabled?: boolean
  actionLabel?: string
}) {
  return (
    <button className={`gb-pile kind-${kind}${actionLabel ? ' has-action' : ''}`} disabled={disabled || !onClick} onClick={onClick} title={hint} aria-label={actionLabel ?? label} type="button">
      <span className="gb-pile-stack">
        <CardBack kind={kind} />
        <CardBack kind={kind} />
        <CardBack kind={kind} actionLabel={actionLabel} />
        <span className="gb-pile-count">{count}</span>
      </span>
      <span className="gb-pile-label">{label}</span>
    </button>
  )
}

function Discard({
  top,
  count,
  label,
  locale,
  onOpen,
}: {
  top: string | undefined
  count: number
  label: string
  locale: Locale
  onOpen: () => void
}) {
  return (
    <div className="gb-discard">
      {top ? (
        <GameCard id={top} locale={locale} onInspect={onOpen} size="sm" />
      ) : (
        <span className="gb-discard-empty" />
      )}
      <span className="gb-pile-label">
        {label} · {count}
      </span>
    </div>
  )
}

function DiscardGallery({ ids, title, locale, closeLabel, onClose, onInspect }: {
  ids: string[]
  title: string
  locale: Locale
  closeLabel: string
  onClose: () => void
  onInspect: (id: string, element: HTMLElement) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])
  return (
    <dialog ref={ref} className="gb-discard-gallery" aria-labelledby="discard-gallery-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <ModalHeader id="discard-gallery-title" title={<>{title} <span>· {ids.length}</span></>} onClose={onClose} closeLabel={closeLabel} />
      <div className="gb-discard-gallery-grid">
        {[...ids].reverse().map((id, index) => {
          const entry = card(id)
          const localized = localizeCard(entry, locale)
          const art = getCardIllustration(entry)
          return <button className="gb-discard-gallery-card" type="button" key={`${id}-${index}`} onClick={(event) => onInspect(id, event.currentTarget)}>{art ? <img alt="" src={art.src} loading="lazy" /> : <span aria-hidden="true" className="dialog-symbol">{TYPE_ICON[entry.type] ?? '✦'}</span>}<span>{localized.name}</span></button>
        })}
      </div>
    </dialog>
  )
}

function Die({ sides, value, rolling, label }: { sides: number; value: number | null; rolling: boolean; label: string }) {
  const [shown, setShown] = useState(1)
  useEffect(() => {
    if (!rolling) return undefined
    const interval = window.setInterval(() => setShown(Math.floor(Math.random() * sides) + 1), 90)
    return () => window.clearInterval(interval)
  }, [rolling, sides])
  return (
    <div className={`gb-die${rolling ? ' is-rolling' : ''}${value === null && !rolling ? ' is-idle' : ''}`}>
      <span className="gb-die-face">{rolling ? shown : (value ?? '?')}</span>
      <span className="gb-die-label">
        {label ? `${label} · ` : ''}D{sides}
      </span>
    </div>
  )
}

function Score({ label, total, parts, side }: { label: string; total: number; parts: string; side: 'you' | 'foe' }) {
  return (
    <div className={`gb-score ${side}`}>
      <span className="gb-score-label">{label}</span>
      <strong>{total}</strong>
      <span className="gb-score-parts">{parts}</span>
    </div>
  )
}

function HeroPower({ power, sim }: { power: PowerBreakdown; sim: Record<string, string> }) {
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
      <span>{sim.yourPower}</span><strong aria-live="polite">{power.total}</strong><span aria-hidden="true" className="gb-power-info">ⓘ</span>
    </button>
    {open ? createPortal(<div id="hero-power-calculation" className="gb-power-tooltip gb-power-tooltip-floating" role="tooltip" style={{ left: position.left, bottom: position.bottom }}>
      <strong>{sim.powerDetails}</strong>
      <dl><div><dt>{sim.levelPart}</dt><dd>{power.level}</dd></div><div><dt>{sim.equipPart}</dt><dd>{power.equipment}</dd></div><div><dt>{sim.bonusPart}</dt><dd>{power.bonus > 0 ? '+' : ''}{power.bonus}</dd></div><div><dt>{sim.diePart}</dt><dd>{power.die ?? sim.notRolled}</dd></div><div className="gb-power-total"><dt>{sim.totalPart}</dt><dd>{power.total}</dd></div></dl>
      <p>{sim.powerCalculationHint}</p>
    </div>, document.body) : null}
  </div>
}

function ClassActive({ klass, name, effect, passive, reasons, disabled, sim, onActivate }: {
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

function PlayerDie({ sides, value, rolling, disabled, reasons, possible, modifiers, sim, onRoll }: {
  sides: number; value: number | null; rolling: boolean; disabled: boolean; reasons: string[]; possible: string; modifiers: string[]; sim: Record<string, string>; onRoll: () => void
}) {
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
  return <div ref={anchor} className="gb-player-die-control" tabIndex={disabled ? 0 : -1} aria-label={`D${sides}`} aria-describedby={open ? 'player-die-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }} onFocus={show} onBlur={() => setOpen(false)} onClick={() => { if (disabled) show() }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
    <button className="gb-player-die-button" type="button" disabled={disabled} onClick={onRoll} aria-label={sim.roll} aria-describedby={open ? 'player-die-tooltip' : undefined}><Die label="" sides={sides} value={value} rolling={rolling} /></button>
    {open ? createPortal(<div className="gb-active-tooltip gb-die-tooltip" id="player-die-tooltip" role="tooltip" style={position}><strong>D{sides} · {sim.diePossible}</strong><p>{possible}</p>{modifiers.map((text, index) => <p className="gb-active-passive" key={index}>{text}</p>)}<div className={`gb-active-availability${disabled ? ' is-disabled' : ''}`}><strong>{disabled ? sim.dieUnavailable : sim.dieReady}</strong>{reasons.length ? <ul>{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</div></div>, document.body) : null}
  </div>
}

function breakdownText(b: PowerBreakdown, labels: { level: string; equip: string; bonus: string; die: string }) {
  const parts: string[] = []
  if (b.level) parts.push(`${labels.level} ${b.level}`)
  parts.push(`${labels.equip} ${b.equipment}`)
  if (b.bonus) parts.push(`${labels.bonus} ${b.bonus > 0 ? '+' : ''}${b.bonus}`)
  if (b.die !== null) parts.push(`${labels.die} ${b.die}`)
  return parts.join(' · ')
}

export function SoloBoard({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) {
  const { locale, t } = useLocale()
  const copy = soloCopy[locale]
  const sim = copy.sim
  const { openCard } = useCardDialog()

  const [game, setGame] = useState<GameState | null>(loadGame)
  const playing = game !== null

  useEffect(() => {
    onPlayingChange?.(playing)
    document.body.classList.toggle('solo-playing', playing)
    if (playing) window.scrollTo(0, 0)
    return () => document.body.classList.remove('solo-playing')
  }, [playing, onPlayingChange])
  useEffect(() => {
    if (!playing) return
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    const syncHeaderHeight = () => document.body.style.setProperty('--header-h', `${header.getBoundingClientRect().height}px`)
    syncHeaderHeight()
    const observer = new ResizeObserver(syncHeaderHeight)
    observer.observe(header)
    return () => { observer.disconnect(); document.body.style.removeProperty('--header-h') }
  }, [playing])
  const gameRef = useRef<GameState | null>(game)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => saveGame(game), 250)
    const flush = () => saveGame(gameRef.current)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pagehide', flush)
    }
  }, [game])
  const [busy, setBusy] = useState<Busy>(null)
  const [playedAction, setPlayedAction] = useState<PlayedAction | null>(null)
  const [bossPresentations, setBossPresentations] = useState<BossPresentation[]>([])
  const [oathCelebrations, setOathCelebrations] = useState<string[]>([])
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [slotOver, setSlotOver] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState<'monster' | 'loot' | null>(null)
  const [fleeNote, setFleeNote] = useState<string | null>(null)
  const [bossReveal, setBossReveal] = useState<string | null>(null)
  const [bossDrawReady, setBossDrawReady] = useState(false)
  const [klass, setKlass] = useState<ClassName>('Guerrier')
  const [race, setRace] = useState<RaceName>('Humain')
  const [heroGender, setHeroGender] = useState<CardGender>('male')
  const timer = useRef<number | undefined>(undefined)
  const revealTimer = useRef<number | undefined>(undefined)
  const fleeNoteTimer = useRef<number | undefined>(undefined)
  const bossPresentationSeq = useRef(0)
  const actionAnimationTimer = useRef<number | undefined>(undefined)
  const actionAnimationSeq = useRef(0)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(revealTimer.current)
      window.clearTimeout(fleeNoteTimer.current)
      window.clearTimeout(actionAnimationTimer.current)
    },
    [],
  )

  const heroName = (type: 'Classe' | 'Race', name: string) => {
    const entry = heroCard(type, name)
    return entry ? localizeCard(entry, locale).name : name
  }

  const jumpTo = (selector: string) => {
    const table = tableRef.current
    const target = table?.querySelector<HTMLElement>(selector)
    if (!table || !target) return
    table.scrollTo({ top: table.scrollTop + target.getBoundingClientRect().top - table.getBoundingClientRect().top - 8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  const showReveal = (next: GameState) => {
    const loot = next.draws.filter((draw) => draw.kind === 'loot').map((draw) => draw.id)
    const monsters = next.draws.filter((draw) => draw.kind === 'monster').map((draw) => draw.id)
    const kind = monsters.length > 0 && loot.length === 0 ? 'monster' : 'loot'
    const cards = (kind === 'monster' ? monsters : loot).slice(0, 5)
    if (cards.length === 0) return
    setReveal({ seq: next.drawSeq, kind, cards })
    window.clearTimeout(revealTimer.current)
    revealTimer.current = window.setTimeout(() => setReveal(null), REVEAL_BASE + cards.length * REVEAL_STAGGER)
  }

  const send = (action: GameAction) => {
    if (!gameRef.current) return
    const previous = gameRef.current
    const next = reduce(previous, action)
    const newlyCompleted = (next.completedOaths ?? []).filter((id) => !(previous.completedOaths ?? []).includes(id))
    if (newlyCompleted.length) setOathCelebrations((current) => [...current, ...newlyCompleted])
    if (action.t === 'drawBoss' && next.combat?.bossId) {
      setBossReveal(next.combat.bossId)
      setBossDrawReady(false)
      window.clearTimeout(revealTimer.current)
      revealTimer.current = window.setTimeout(() => setBossDrawReady(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1600)
    }
    // The engine keeps only the latest 400 entries. Match the retained history
    // so new Boss events are still shown when that limit has been reached.
    const previousLogs = previous.log.map((entry) => JSON.stringify(entry))
    const nextLogs = next.log.map((entry) => JSON.stringify(entry))
    let retained = Math.min(previousLogs.length, nextLogs.length)
    while (retained > 0 && !previousLogs.slice(-retained).every((entry, index) => entry === nextLogs[index])) retained -= 1
    const newLogs = next.log.slice(retained)
    if (action.t === 'playAction' && newLogs.some((entry) => entry.code === 'actionPlayed')) {
      const visual = actionVisual(card(action.id).name, newLogs.some((entry) => entry.code === 'actionCancelled'))
      const selectors = { hero: '.gb-player-combat-status', foe: '.gb-foe', 'player-die': '.gb-player-combat-status .gb-die', 'foe-die': '.gb-scoreboard .gb-dice', hand: '.gb-hand' }
      const target = document.querySelector(selectors[visual.target])?.getBoundingClientRect()
      const source = document.querySelector(`.gb-hand [data-card-id="${action.id}"]`)?.getBoundingClientRect()
      const x = Math.max(75, Math.min(window.innerWidth - 75, target ? target.left + target.width / 2 : window.innerWidth / 2))
      const y = Math.max(110, Math.min(window.innerHeight - 110, target ? target.top + target.height / 2 : window.innerHeight / 2))
      const destroyedId = newLogs.find((entry) => entry.code === 'bossItemDestroyed')?.params?.card
      const destroyedBounds = typeof destroyedId === 'string' ? document.querySelector(`.gb-foe-equip [data-card-id="${destroyedId}"]`)?.getBoundingClientRect() : undefined
      const previousPower = computePower(previous)
      const nextPower = computePower(next)
      const delta = visual.target === 'player-die' ? (next.combat?.playerDie ?? 0) - (previous.combat?.playerDie ?? 0) : visual.target === 'foe-die' ? (next.combat?.bossDie ?? 0) - (previous.combat?.bossDie ?? 0) : visual.target === 'foe' && previousPower && nextPower ? nextPower.opponent.total - previousPower.opponent.total : visual.target === 'hero' ? computePlayerPower(next).total - computePlayerPower(previous).total : 0
      const result = visual.effect === 'cancelled' ? sim.cancelledAction : next.dieSides !== previous.dieSides ? `D${previous.dieSides} → D${next.dieSides}` : delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}` : next.draws.filter((draw) => draw.kind === 'loot').length > 0 ? `+${next.draws.filter((draw) => draw.kind === 'loot').length} ${sim.cards}` : ''
      setPlayedAction({ id: action.id, ...visual, seq: ++actionAnimationSeq.current, x, y, dx: source ? source.left + source.width / 2 - x : 0, dy: source ? source.top + source.height / 2 - y : 120, result, lines: newLogs.filter((entry) => entry.code !== 'actionPlayed'), destroyed: typeof destroyedId === 'string' && destroyedBounds ? { id: destroyedId, x: destroyedBounds.left + destroyedBounds.width / 2, y: destroyedBounds.top + destroyedBounds.height / 2 } : undefined })
      window.clearTimeout(actionAnimationTimer.current)
      actionAnimationTimer.current = window.setTimeout(() => { setPlayedAction(null); if (next.draws.length > 0) showReveal(next) }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 1800)
    }
    const bossEvents = newLogs.filter((entry) => ['bossForce', 'bossAwakens', 'bossPlays', 'bossRolled', 'bossStack', 'bossDecree', 'bossSwap', 'bossAscension', 'bossRecovers'].includes(entry.code))
    if (bossEvents.length > 0) {
      setBossPresentations(bossEvents.map((entry) => ({
        id: typeof entry.params?.card === 'string' ? entry.params.card : next.combat?.bossId ?? undefined,
        lines: [entry, ...(entry.code === 'bossPlays' ? newLogs.filter((detail) => detail.code === 'playerItemDestroyed') : [])],
        seq: ++bossPresentationSeq.current,
      })))
    }
    gameRef.current = next
    setGame(next)
    if (next.draws.length > 0 && !(action.t === 'playAction' && newLogs.some((entry) => entry.code === 'actionPlayed'))) showReveal(next)
  }

  const start = () => {
    window.clearTimeout(actionAnimationTimer.current)
    setPlayedAction(null)
    window.clearTimeout(timer.current)
    window.clearTimeout(revealTimer.current)
    setBusy(null)
    setBossPresentations([])
    setOathCelebrations([])
    setDiscardOpen(null)
    setReveal(null)
    setBossReveal(null)
    gameRef.current = newGame(klass, race)
    setGame(gameRef.current)
  }

  const reset = () => {
    window.clearTimeout(actionAnimationTimer.current)
    setPlayedAction(null)
    window.clearTimeout(timer.current)
    window.clearTimeout(revealTimer.current)
    setBusy(null)
    setBossPresentations([])
    setOathCelebrations([])
    setDiscardOpen(null)
    setBossReveal(null)
    setReveal(null)
    gameRef.current = null
    setGame(null)
  }

  const delayed = (kind: Exclude<Busy, null>, delay: number, action: GameAction) => {
    setBusy(kind)
    timer.current = window.setTimeout(() => {
      send(action)
      setBusy(null)
    }, delay)
  }

  const flee = () => {
    setBusy('rolling')
    setFleeNote(null)
    timer.current = window.setTimeout(() => {
      send({ t: 'flee' })
      setBusy(null)
      const last = gameRef.current?.log.at(-1)
      if (last?.code === 'fleeFailed') setFleeNote(fill(sim.fleeFailedNote, { value: Number(last.params?.value ?? 0) }))
      else if (last?.code === 'fled') setFleeNote(Number(last.params?.value) > 0 ? fill(sim.fleeOkNote, { value: Number(last.params?.value) }) : sim.fleeAuto)
      window.clearTimeout(fleeNoteTimer.current)
      fleeNoteTimer.current = window.setTimeout(() => setFleeNote(null), 3500)
    }, ROLL_DELAY)
  }

  const runBossSequence = () => {
    const current = gameRef.current
    if (!current?.combat || current.combat.kind !== 'boss' || current.promptQueue.length > 0) {
      setBusy(null)
      return
    }
    setBusy('boss')
    send({ t: 'bossStep' })
    if (!gameRef.current?.combat || gameRef.current.promptQueue.length > 0) setBusy(null)
  }

  const nextBossPresentation = () => {
    if (bossPresentations.length > 1) {
      setBossPresentations((entries) => entries.slice(1))
      return
    }
    setBossPresentations([])
    if (busy === 'boss') runBossSequence()
  }

  const inspect = (id: string, element: HTMLElement, actions?: ReactNode) => openCard(card(id), undefined, element, actions)

  const formatLog = (entry: { code: string; params?: Record<string, string | number> }) => {
    const template = copy.log[entry.code]
    if (!template) return entry.code
    const params: Record<string, string | number> = {}
    for (const [key, value] of Object.entries(entry.params ?? {})) {
      if (typeof value === 'string' && value.startsWith('OSS-CARD-')) {
        params[key] = localizeCard(card(value), locale).name
      } else if (key === 'klass') params[key] = heroName('Classe', String(value))
      else if (key === 'race') params[key] = heroName('Race', String(value))
      else params[key] = value
    }
    return fill(template, params)
  }


  if (!game) {
    return (
      <div className="sim-setup">
        <div className="sim-setup-heading">
          <p className="eyebrow">{sim.setupEyebrow}</p>
          <h3>{sim.setupTitle}</h3>
          <p className="sim-intro">{sim.intro}</p>
        </div>
        <div className="sim-builder">
        <div className="sim-mobile-launch">
          <div><span>{sim.yourHero}</span><strong>{heroName('Race', race)} · {heroName('Classe', klass)}</strong></div>
          <button className="button button-primary" onClick={start} type="button">{sim.start}</button>
        </div>
        <div className="sim-builder-choices">
        <section className="sim-choice-section" aria-labelledby="setup-class">
        <div className="sim-choice-heading"><span className="sim-step" aria-hidden="true">01</span><div><h4 id="setup-class">{sim.chooseClass}</h4><p>{sim.classHint}</p></div></div>
        <div className="sim-choice-grid">
          {CLASS_NAMES.map((name) => (
            <HeroChoice
              active={klass === name}
              entry={heroCard('Classe', name)}
              key={name}
              label={heroName('Classe', name)}
              onClick={() => setKlass(name)}
            />
          ))}
        </div>
        </section>
        <section className="sim-choice-section" aria-labelledby="setup-race">
        <div className="sim-choice-heading"><span className="sim-step" aria-hidden="true">02</span><div><h4 id="setup-race">{sim.chooseRace}</h4><p>{sim.raceHint}</p></div></div>
        {RACE_NAMES.some((name) => {
          const entry = heroCard('Race', name)
          return entry && hasFemaleVariant(entry)
        }) && (
          <div className="variant-switch sim-gender-switch" role="group" aria-label={t('card.variants')}>
            {(['male', 'female'] as const).map((option) => (
              <button type="button" key={option} aria-pressed={heroGender === option} onClick={() => setHeroGender(option)}>
                {t(option === 'male' ? 'card.variantMale' : 'card.variantFemale')}
              </button>
            ))}
          </div>
        )}
        <div className="sim-choice-grid">
          {RACE_NAMES.map((name) => (
            <HeroChoice
              active={race === name}
              entry={heroCard('Race', name)}
              gender={heroGender}
              key={name}
              label={heroName('Race', name)}
              onClick={() => setRace(name)}
            />
          ))}
        </div>
        </section>
        </div>
        <aside className="sim-hero-summary" aria-labelledby="setup-summary-title">
          <p className="eyebrow" id="setup-summary-title">{sim.yourHero}</p>
          <h3>{heroName('Race', race)} <span>· {heroName('Classe', klass)}</span></h3>
          <div className="sim-hero-portraits">
            {(['Classe', 'Race'] as const).map((kind) => {
              const entry = heroCard(kind, kind === 'Classe' ? klass : race)
              const art = entry ? getCardIllustration(entry, kind === 'Race' ? heroGender : 'male') : undefined
              return art ? <img alt={heroName(kind, kind === 'Classe' ? klass : race)} src={art.src} key={kind} /> : null
            })}
          </div>
          <div className="sim-hero-details" aria-live="polite">
            {(['Classe', 'Race'] as const).map((kind) => {
              const entry = heroCard(kind, kind === 'Classe' ? klass : race)
              if (!entry) return null
              const localized = localizeCard(entry, locale)
              return <div key={kind}><div className="sim-hero-detail-heading"><strong>{localized.name}</strong><button className="sim-link" type="button" onClick={(event) => inspect(entry.id, event.currentTarget)}>{sim.inspect}</button></div><p>{localized.text}</p></div>
            })}
          </div>
          <div className="sim-launch">
          <p>{sim.startingKit}</p>
        <button className="button button-primary" onClick={start} type="button">
          {sim.start}
        </button>
          </div>
        </aside>
        </div>
      </div>
    )
  }

  const combat = game.combat
  const pendingMonsterIds = new Set(reveal || playedAction ? game.draws.filter((draw) => draw.kind === 'monster').map((draw) => draw.id) : [])
  const power = computePower(game)
  const prompt: Prompt | undefined = game.promptQueue[0]
  const ended = game.phase === 'won' || game.phase === 'lost'
  const main = game.phase === 'main' && !combat
  const locked = busy !== null || playedAction !== null || bossReveal !== null || bossPresentations.length > 0 || oathCelebrations.length > 0 || Boolean(prompt) || reveal !== null || ended
  const equipmentEditable = !locked && canChangeEquipment(game)
  const status = activeStatus(game)
  const activeCard = heroCard('Classe', status.klass)
  const activeEffect = status.klass === 'Voleur' ? sim.soloRogueEffect : copy.rules.flatMap((section) => section.items).find((item) => item.startsWith(`${heroName('Classe', status.klass)} —`)) ?? (activeCard ? localizeCard(activeCard, locale).text ?? '' : '')
  const activeReasons = status.reasons.map((reason) => fill(sim[`activeBlocked_${reason.code}`], { required: reason.required ?? 0, current: reason.current ?? 0 }))
  if (busy || playedAction || reveal || bossReveal || bossPresentations.length) activeReasons.unshift(sim.activeWait)
  if (oathCelebrations.length) activeReasons.unshift(sim.activeOathWait)
  const dieReasons: string[] = []
  if (ended) dieReasons.push(sim.activeBlocked_ended)
  else if (!combat) dieReasons.push(sim.dieNeedsCombat)
  if (combat?.playerDie !== null && combat) dieReasons.push(sim.dieAlreadyRolled)
  if (busy || playedAction || reveal || bossReveal || bossPresentations.length) dieReasons.push(sim.activeWait)
  if (prompt) dieReasons.push(sim.activeBlocked_choice)
  if (oathCelebrations.length) dieReasons.push(sim.activeOathWait)
  const diceCount = combat?.flags.includes('doubleDie') ? 2 : 1
  const dieBonus = (game.race === 'Elfe' ? 1 : 0) + permanentDieBonus(game)
  const dieMinimum = diceCount * (1 + dieBonus)
  const dieMaximum = diceCount * (game.dieSides + dieBonus)
  const possibleRolls = Array.from({ length: dieMaximum - dieMinimum + 1 }, (_, index) => dieMinimum + index).join(', ')
  const dieModifiers = [game.race === 'Elfe' ? sim.dieElfBonus : '', permanentDieBonus(game) ? sim.dieOathBonus : '', diceCount === 2 ? sim.dieDouble : '', diceCount === 1 && combat?.flags.includes('wyrm') ? sim.dieWyrm : ''].filter(Boolean)
  const limit = handLimit(game)
  const bossUnlocked = game.level >= 10
  const tavern = prompt?.purpose === 'tavern'
  const dragFrom = (from: Drag['from'], id: string) => ({
    draggable: true,
    onDragEnd: () => {
      setDrag(null)
      setOver(null)
      setSlotOver(null)
    },
    onDragStart: () => {
      window.setTimeout(() => setDrag({ id, from }), 0)
    },
  })
  const handDraggable = busy === null && playedAction === null && bossReveal === null && bossPresentations.length === 0 && oathCelebrations.length === 0 && reveal === null && !ended && (!prompt || tavern)

  const zone = (key: string, accepts: boolean, onDrop: () => void) => ({
    className: `${accepts && drag ? ' is-target' : ''}${over === key && accepts ? ' is-over' : ''}`,
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((current) => (current === key ? null : current))
    },
    onDragOver: (event: DragEvent) => {
      if (!accepts) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      if (over !== key) setOver(key)
    },
    onDrop: (event: DragEvent) => {
      if (!accepts) return
      event.preventDefault()
      event.stopPropagation()
      setOver(null)
      setDrag(null)
      onDrop()
    },
  })

  const fromHand = drag?.from === 'hand' ? drag.id : null
  const fromEquip = drag?.from === 'equip' ? drag.id : null
  const equipZone = zone('equip', Boolean(fromHand && !locked && canEquip(game, fromHand)), () => {
    if (fromHand) send({ t: 'equip', id: fromHand })
  })
  const playZone = zone('play', Boolean(fromHand && !locked && canPlayAction(game, fromHand)), () => {
    if (fromHand) send({ t: 'playAction', id: fromHand })
  })
  const draggedAction = fromHand && !locked && canPlayAction(game, fromHand) ? card(fromHand).name : null
  const targetsOpponent = Boolean(combat && draggedAction && ['Faiblesse', 'Frénésie', 'Apaiser', 'Malchance', 'Dépossession', 'Brise-armure', 'Destruction', 'Corrosion', 'Exécution', 'Peur'].includes(draggedAction))
  const foeZone = zone('foe', targetsOpponent, () => {
    if (fromHand) send({ t: 'playAction', id: fromHand })
  })
  const handZone = zone('hand', Boolean(fromEquip && equipmentEditable), () => {
    if (fromEquip) send({ t: 'unequip', id: fromEquip })
  })

  const tradeWith = (offered: string, give: string) => {
    send({ t: 'answer', option: offered })
    send({ t: 'answer', option: give })
  }

  const labels = { level: sim.levelPart, equip: sim.equipPart, bonus: sim.bonusPart, die: sim.diePart }
  const foeLabels = { ...labels, equip: combat?.kind === 'boss' ? sim.equipPart : sim.powerPart }
  const monsterTop = game.monsterDiscard[game.monsterDiscard.length - 1]
  const lootTop = game.lootDiscard[game.lootDiscard.length - 1]
  const hero = (type: 'Classe' | 'Race', name: string) => heroCard(type, name)

  const slotClass = (key: string, slot: string) => {
    if (!fromHand || locked || !canEquip(game, fromHand) || !slotAccepts(slot, fromHand)) return ''
    return ` is-target${slotOver === key ? ' is-over' : ''}`
  }

  const renderEquipped = (id: string | null | undefined, slot: string) =>
    id ? (
      <GameCard
        playerClass={game.klass}
        allWeaponMastery={oathCompleted(game, OATH.foreignIron)}
        equipmentPower={equipmentCardPower(game, id)}
        id={id}
        locale={locale}
        onInspect={(element) => inspect(id, element)}
        size="sm"
        {...(equipmentEditable ? dragFrom('equip', id) : {})}
        actions={
          equipmentEditable ? (
            <button aria-label={sim.unequipBtn} onClick={() => send({ t: 'unequip', id })} title={sim.unequipBtn} type="button">
              ✕
            </button>
          ) : undefined
        }
      />
    ) : (
      <span className="gb-slot-empty">{TYPE_ICON[slot.startsWith('hand') ? 'Arme' : slot === 'artifact' ? 'Artefact de classe' : 'Armure']}</span>
    )

  return (
    <div className={`gb gb-full${playedAction ? ` gb-effect-${playedAction.effect} gb-effect-target-${playedAction.target}` : ''}`}>
      <div className="gb-hud">
        {fleeNote ? <div className="gb-toast">{fleeNote}</div> : null}
        <LevelTimeline game={game} />
        <Stat label={sim.turn} value={game.turn} />
        <Stat label={sim.hand} value={`${game.hand.length}/${limit}`} />
        <button className="sim-link" onClick={reset} type="button">
          {sim.restart}
        </button>
        <nav className="gb-mobile-nav" aria-label={sim.mobileNavigation}>
          <button type="button" onClick={() => jumpTo('.gb-center')}>{sim.mobileCombat}</button>
          <button type="button" onClick={() => jumpTo('.gb-board')}>{sim.yourHero}</button>
        </nav>
      </div>

      <div className="gb-table" ref={tableRef}>
        <div className="gb-side gb-side-left">
          <Pile
            count={game.monsterDeck.length}
            disabled={locked || !main}
            hint={sim.pickMonster}
            actionLabel={sim.fight}
            kind="monster"
            label={sim.pileMonster}
            onClick={() => send({ t: 'fightMonster' })}
          />
          <Discard count={game.monsterDiscard.length} label={sim.tableMonster} locale={locale} onOpen={() => setDiscardOpen('monster')} top={monsterTop} />
        </div>

        <div className="gb-center">
        <section className={`gb-arena${playZone.className}`} onDragLeave={playZone.onDragLeave} onDragOver={playZone.onDragOver} onDrop={playZone.onDrop}>
          {ended ? (
            <div className={`sim-end ${game.phase}`}>
              <h3>{game.phase === 'won' ? sim.victoryTitle : sim.defeatTitle}</h3>
              <p>{game.phase === 'won' ? sim.victoryText : sim.defeatText}</p>
              <p>
                {fill(sim.stats, { m: game.stats.monsters, d: game.stats.defeats, f: game.stats.flees, t: game.turn })}
              </p>
              <button className="button button-primary" onClick={reset} type="button">
                {sim.restart}
              </button>
            </div>
          ) : combat ? (
            <>
              <div className={`gb-foe${foeZone.className}`} onDragLeave={foeZone.onDragLeave} onDragOver={foeZone.onDragOver} onDrop={foeZone.onDrop}>
                {targetsOpponent ? <span className="gb-target-label">{sim.dropOnOpponent}</span> : null}
                {combat.kind === 'boss' && combat.bossId ? (
                  <GameCard className={targetsOpponent ? 'gb-opponent-target' : ''} id={combat.bossId} locale={locale} onInspect={(el) => inspect(combat.bossId as string, el)} size="lg" />
                ) : null}
                {combat.monsters.filter((id) => !pendingMonsterIds.has(id)).map((id) => (
                  <div className="gb-monster-encounter" key={id}>
                    <GameCard className={targetsOpponent ? 'gb-opponent-target' : ''} id={id} locale={locale} onInspect={(el) => inspect(id, el)} size="lg" />
                    {card(id).text && <div className="gb-monster-effect" key={`${id}-${game.turn}`}><span className="eyebrow">{sim.monsterEffect}</span><strong>{localizeCard(card(id), locale).name}</strong><p>{localizeCard(card(id), locale).text}</p></div>}
                  </div>
                ))}
                {combat.kind === 'boss' ? (
                  <div className="gb-foe-gear">
                    <div className="gb-foe-equip">
                      {combat.bossEquip.map((id) => (
                        <GameCard id={id} key={id} locale={locale} onInspect={(el) => inspect(id, el)} size="sm" />
                      ))}
                    </div>
                    <div className="gb-foe-hand" style={{ '--boss-hand-count': combat.bossHand.length } as CSSProperties} title={`${sim.bossHandCount} : ${combat.bossHand.length}`}>
                      {combat.bossHand.map((id, index) => (
                        <CardBack key={`${id}-${index}`} kind="boss" size="sm" />
                      ))}
                    </div>
                    <span className="sim-note">
                      {sim.bossHandCount} : {combat.bossHand.length} {sim.cards}
                    </span>
                  </div>
                ) : null}
              </div>

              {power ? (
                <div className="gb-scoreboard">
                  <Score label={sim.you} parts={breakdownText(power.player, labels)} side="you" total={power.player.total} />
                  <div className="gb-dice">
                    {power.opponent.die !== null ? (
                      <Die label={sim.opponent} rolling={false} sides={combat.kind === 'boss' ? combat.bossSides : 6} value={power.opponent.die} />
                    ) : null}
                  </div>
                  <Score label={sim.opponent} parts={breakdownText(power.opponent, foeLabels)} side="foe" total={power.opponent.total} />
                </div>
              ) : null}

              <div className={`gb-playzone${playZone.className}`} onDragLeave={playZone.onDragLeave} onDragOver={playZone.onDragOver} onDrop={playZone.onDrop}>
                {busy ? <span className="gb-playzone-hint">{busy === 'rolling' ? sim.rolling : sim.resolving}</span> : null}
                <div className="gb-controls">
                  {combat.playerDie === 1 && !combat.oathRerollUsed && oathCompleted(game, OATH.misfortune) ? <button className="button" disabled={locked} type="button" onClick={() => delayed('rolling', ROLL_DELAY, { t: 'oathReroll' })}>{sim.oathReroll}</button> : null}
                  <button
                    className="button button-primary"
                    disabled={locked}
                    onClick={() => (combat.kind === 'boss' ? runBossSequence() : delayed('resolving', RESOLVE_DELAY, { t: 'resolve' }))}
                    type="button"
                  >
                    {combat.playerDie === null ? sim.resolveNoDie : sim.resolve}
                  </button>
                  {!fleeBlocked(game) ? (
                    <button className="button gb-flee-button" disabled={locked} onClick={flee} title={sim.fleeHint} type="button">
                      <FleeIcon />
                      <span>{sim.flee}</span><span className="gb-flee-threshold">D6 · 4+</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className={`gb-idle${playZone.className}`} onDragLeave={playZone.onDragLeave} onDragOver={playZone.onDragOver} onDrop={playZone.onDrop}>
              <p className="gb-idle-title">{sim.adventure}</p>
              <Pile
                count={BOSS_IDS.length}
                disabled={locked || !bossUnlocked}
                hint={bossUnlocked ? sim.boss : sim.bossLocked}
                kind="boss"
                label={bossUnlocked ? sim.boss : sim.bossLocked}
                onClick={() => send({ t: 'drawBoss' })}
              />
              {!bossUnlocked ? <p className="sim-note">{sim.bossWaits}</p> : null}
            </div>
          )}
        </section>
        </div>
        <section className="gb-board" style={{ '--board-card-count': 9 + (game.oaths?.length ?? 0) + (game.equipment.extraArmor ? 1 : 0), '--hero-card-count': 2 + (game.oaths?.length ?? 0) } as CSSProperties}>
          <h3>{sim.equipment}</h3>
          <div className="gb-board-body">
            <section className="gb-board-group gb-native-group" aria-labelledby="board-hero-title">
            <div className="gb-hero-level-row"><div className="gb-level" title={sim.level}><span className="gb-level-label">{sim.level}</span><span className="gb-level-value"><strong>{game.level}</strong><span className="gb-level-max">/10</span></span></div></div>
            <h4 id="board-hero-title">{sim.yourHero}</h4>
            <div className="gb-heroes">
              {(['Race', 'Classe'] as const).map((kind) => {
                const entry = hero(kind, kind === 'Race' ? game.race : game.klass) as { id: string } | undefined
                if (!entry) return null
                return (
                  <div className="gb-slot" key={kind}>
                    <span className="gb-slot-label">{kind === 'Race' ? sim.raceLabel : sim.classLabel}</span>
                    <GameCard id={entry.id} locale={locale} onInspect={(el) => inspect(entry.id, el)} size="sm" />
                  </div>
                )
              })}
              {(game.oaths ?? []).map((id) => (
                <div className="gb-slot" key={id}>
                  <span className="gb-slot-label">{localizeCard(card(id), locale).type}{oathCompleted(game, id) ? ' ✓' : ''}</span>
                  <GameCard className={oathCompleted(game, id) ? 'gb-oath-completed' : ''} id={id} locale={locale} onInspect={(el) => inspect(id, el)} size="sm" />
                </div>
              ))}
            </div>
            </section>
            <section className={`gb-board-group gb-equipment-group${equipZone.className}`} aria-labelledby="board-equipment-title" onDragLeave={equipZone.onDragLeave} onDragOver={equipZone.onDragOver} onDrop={equipZone.onDrop}>
            <div className="gb-player-combat-status">
              <HeroPower power={computePlayerPower(game)} sim={sim} />
              <PlayerDie sides={game.dieSides} value={combat?.playerDie ?? null} rolling={busy === 'rolling'} disabled={locked || !combat || combat.playerDie !== null} reasons={dieReasons} possible={possibleRolls} modifiers={dieModifiers} sim={sim} onRoll={() => delayed('rolling', ROLL_DELAY, { t: 'roll' })} />
              <ClassActive klass={status.klass} name={heroName('Classe', status.klass)} effect={activeEffect} passive={fill(sim.classPassive, { klass: heroName('Classe', game.klass) })} reasons={activeReasons} disabled={locked || !status.available} sim={sim} onActivate={() => send({ t: 'useActive' })} />
            </div>
            <h4 id="board-equipment-title">{sim.equipment}</h4>
            <div className="gb-slots">
              {ARMOR_SLOTS.map((slot) => (
                <div className={`gb-slot${slotClass(slot, slot)}`} key={slot} onDragEnter={() => setSlotOver(slot)} onDragOver={() => setSlotOver(slot)}>
                  <span className="gb-slot-label">{slot}</span>
                  {renderEquipped(game.equipment.armors[slot], slot)}
                </div>
              ))}
              {game.equipment.extraArmor ? <div className={`gb-slot${slotClass('extra-armor', game.equipment.extraArmor.slot)}`} onDragEnter={() => setSlotOver('extra-armor')} onDragOver={() => setSlotOver('extra-armor')}><span className="gb-slot-label">{game.equipment.extraArmor.slot} · 2</span>{renderEquipped(game.equipment.extraArmor.id, game.equipment.extraArmor.slot)}</div> : null}
              {[0, 1].map((index) => {
                const twoHanded = game.equipment.hands.length === 1 && card(game.equipment.hands[0]).subtype === 'Deux mains'
                return (
                  <div className={`gb-slot${slotClass(`hand-${index}`, 'hand')}`} key={`hand-${index}`} onDragEnter={() => setSlotOver(`hand-${index}`)} onDragOver={() => setSlotOver(`hand-${index}`)}>
                    <span className="gb-slot-label">
                      {sim.weapons} {index + 1}
                    </span>
                    {twoHanded && index === 1 ? <div className="gb-two-handed-copy"><GameCard id={game.equipment.hands[0]} allWeaponMastery={oathCompleted(game, OATH.foreignIron)} equipmentPower={equipmentCardPower(game, game.equipment.hands[0])} playerClass={game.klass} locale={locale} onInspect={(el) => inspect(game.equipment.hands[0], el)} size="sm" /><span className="gb-two-handed-label">{sim.twoHanded}</span></div> : renderEquipped(game.equipment.hands[index], 'hand')}
                  </div>
                )
              })}
              <div className={`gb-slot${slotClass('artifact', 'artifact')}`} onDragEnter={() => setSlotOver('artifact')} onDragOver={() => setSlotOver('artifact')}>
                <span className="gb-slot-label">{sim.artifact}</span>
                {renderEquipped(game.equipment.artifact, 'artifact')}
              </div>
            </div>
            </section>
          </div>
          <p className="gb-board-hint">{sim.dropEquip}</p>
        </section>

        <div className="gb-side gb-side-right">
          <Pile
            count={game.lootDeck.length}
            disabled={locked || !main}
            hint={sim.pickLoot}
            actionLabel={game.race === 'Nain' ? sim.drawLootNain : sim.drawLoot}
            kind="loot"
            label={sim.pileLoot}
            onClick={() => send({ t: 'drawLoot' })}
          />
          <Discard count={game.lootDiscard.length} label={sim.tableLoot} locale={locale} onOpen={() => setDiscardOpen('loot')} top={lootTop} />
        </div>
      </div>

      <div
        className={`gb-dock${tavern ? ' is-above' : ''}${handZone.className}`}
        onDragLeave={handZone.onDragLeave}
        onDragOver={handZone.onDragOver}
        onDrop={handZone.onDrop}
      >
        <span className="gb-dock-label">
          {sim.handDock} · {game.hand.length}/{limit}
          {drag?.from === 'equip' ? ` — ${sim.dropHand}` : ''}
        </span>
        <div className="gb-hand">
          {game.hand.map((id, index) => {
            const entry = card(id)
            const isGear = entry.type === 'Armure' || entry.type === 'Arme' || entry.type === 'Artefact de classe'
            const equipable = !locked && canEquip(game, id)
            const playable = !locked && entry.type === 'Action' && canPlayAction(game, id)
            const actions = isGear ? (
              <button className="button" disabled={!equipable} onClick={() => send({ t: 'equip', id })} type="button">
                {sim.equipBtn}
              </button>
            ) : entry.type === 'Action' ? (
              <button className="button" disabled={!playable} onClick={() => send({ t: 'playAction', id })} type="button">
                {sim.play}
              </button>
            ) : undefined
            return (
              <GameCard
                className={drag?.id === id ? 'is-dragging' : ''}
                playerClass={game.klass}
                allWeaponMastery={oathCompleted(game, OATH.foreignIron)}
                id={id}
                key={`${id}-${index}`}
                locale={locale}
                onInspect={(el) => inspect(id, el, actions)}
                size="hand"
                mobileActions={actions}
                style={{ '--i': index, '--n': game.hand.length } as CSSProperties}
                {...(handDraggable ? dragFrom('hand', id) : {})}
              />
            )
          })}
        </div>
      </div>

      {playedAction ? createPortal(<div className={`gb-action-animation effect-${playedAction.effect}`} key={playedAction.seq} aria-live="polite">
        <div className="gb-action-flight" style={{ left: playedAction.x, top: playedAction.y, '--action-dx': `${playedAction.dx}px`, '--action-dy': `${playedAction.dy}px` } as CSSProperties}>
          <div className="gb-action-card-motion"><GameCard decorative id={playedAction.id} locale={locale} onInspect={() => undefined} size="md" /></div>
          <span className="gb-action-impact" aria-hidden="true" />
          {playedAction.result ? <strong className="gb-action-result">{playedAction.result}</strong> : null}
        </div>
        {playedAction.destroyed ? <div className="gb-destroyed-card-ghost" style={{ left: playedAction.destroyed.x, top: playedAction.destroyed.y }}><GameCard decorative id={playedAction.destroyed.id} locale={locale} onInspect={() => undefined} size="sm" /></div> : null}
        <div className="gb-action-announcement"><strong>{localizeCard(card(playedAction.id), locale).name}</strong><p>{playedAction.lines.length ? playedAction.lines.slice(0, 2).map(formatLog).join(' ') : localizeCard(card(playedAction.id), locale).text}</p></div>
      </div>, document.body) : null}

      {oathCelebrations[0] && !playedAction && !reveal && !bossReveal && bossPresentations.length === 0 ? (
        <aside className="gb-oath-celebration" key={oathCelebrations[0]} aria-label={sim.oathValidated}>
          <div className="gb-oath-celebration-heading"><span className="eyebrow">✓ {sim.oathValidated}</span><button type="button" aria-label={sim.close} onClick={() => setOathCelebrations((current) => current.slice(1))}>×</button></div>
          <div className="gb-oath-celebration-body">
            <GameCard id={oathCelebrations[0]} locale={locale} onInspect={(el) => inspect(oathCelebrations[0], el)} size="sm" className="gb-oath-reward-card" />
            <div role="status"><h3>{localizeCard(card(oathCelebrations[0]), locale).name}</h3><p>{(localizeCard(card(oathCelebrations[0]), locale).text ?? '').split(/(?:Accomplissement|Fulfillment)\s*—\s*/)[1]?.split(/(?:Récompense|Reward)\s*—\s*/)[0]}</p><strong>{oathCelebrations[0] === OATH.exhaustedArcana ? sim.oathReward : sim.oathPermanentReward}</strong><p className="gb-oath-reward-text">{(localizeCard(card(oathCelebrations[0]), locale).text ?? '').split(/(?:Récompense|Reward)\s*—\s*/)[1]}</p></div>
          </div>
          <button className="button gb-oath-continue" type="button" onClick={() => setOathCelebrations((current) => current.slice(1))}>{sim.nextAction} →</button>
        </aside>
      ) : null}

      {reveal ? (
        <div className="gb-reveal" key={reveal.seq}>
          <p className="gb-reveal-title">{reveal.kind === 'monster' ? sim.monsterAppears : sim.drewLootTitle}</p>
          <div className="gb-reveal-cards">
            {reveal.cards.map((id, index) => (
              <div className={`gb-reveal-card from-${reveal.kind}`} key={`${id}-${index}`} style={{ '--d': `${index * (REVEAL_STAGGER / 1000)}s` } as CSSProperties}>
                <span className="gb-reveal-back">
                  <CardBack kind={reveal.kind} size="lg" />
                </span>
                <GameCard id={id} locale={locale} onInspect={() => undefined} size="lg" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {bossPresentations[0] && !bossReveal ? (
        <div className="sim-modal-backdrop gb-boss-action-backdrop">
          <div className={`sim-modal gb-boss-action effect-${bossPresentations[0].id ? actionVisual(card(bossPresentations[0].id).name).effect : 'magic'}`} role="dialog" aria-modal="true" aria-labelledby="boss-action-title" key={bossPresentations[0].seq}>
            <ModalHeader id="boss-action-title" title={sim.bossActionTitle} />
            <div className="gb-boss-action-layout">
              {bossPresentations[0].id ? <GameCard id={bossPresentations[0].id} locale={locale} onInspect={(el) => inspect(bossPresentations[0].id as string, el)} size="lg" className="gb-boss-played-card" /> : null}
              <div className="gb-boss-action-copy" aria-live="polite">
                {bossPresentations[0].lines.map((entry, index) => <p className="gb-boss-action-result" key={index}>{formatLog(entry)}</p>)}
                {bossPresentations[0].id ? <p>{localizeCard(card(bossPresentations[0].id), locale).text}</p> : null}
                {bossPresentations[0].lines.filter((entry) => entry.code === 'playerItemDestroyed' && typeof entry.params?.card === 'string').map((entry) => <div className="gb-boss-destroyed-item" key={String(entry.params!.card)}><GameCard id={String(entry.params!.card)} locale={locale} onInspect={(el) => inspect(String(entry.params!.card), el)} size="sm" /></div>)}
                <p className="sim-note">{sim.bossActionHint}</p>
                <button className="button button-primary" autoFocus onClick={nextBossPresentation} type="button">{sim.nextAction} →</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {discardOpen ? <DiscardGallery ids={discardOpen === 'monster' ? game.monsterDiscard : game.lootDiscard} title={discardOpen === 'monster' ? sim.tableMonster : sim.tableLoot} locale={locale} closeLabel={sim.close} onClose={() => setDiscardOpen(null)} onInspect={inspect} /> : null}


      {bossReveal ? (
        <div className="sim-modal-backdrop gb-boss-draw-backdrop">
          <div aria-modal="true" aria-labelledby="boss-draw-title" className="sim-modal gb-boss-draw" role="dialog">
            <ModalHeader id="boss-draw-title" title={sim.bossDrawTitle} />
            <div className="gb-boss-draw-card">
              <div className="gb-boss-draw-back"><CardBack kind="boss" size="lg" /></div>
              <button className="gb-boss-draw-front" type="button" onClick={(event) => inspect(bossReveal, event.currentTarget)} aria-label={sim.inspect}>
                {getCardIllustration(card(bossReveal)) ? <img alt={localizeCard(card(bossReveal), locale).name} src={getCardIllustration(card(bossReveal))!.src} /> : <span>{localizeCard(card(bossReveal), locale).name}</span>}
              </button>
            </div>
            <div className="gb-boss-draw-info"><h3>{localizeCard(card(bossReveal), locale).name}</h3><p>{localizeCard(card(bossReveal), locale).text}</p></div>
            <button className="button button-primary gb-boss-draw-continue" disabled={!bossDrawReady} type="button" onClick={() => setBossReveal(null)}>{sim.nextAction} →</button>
          </div>
        </div>
      ) : null}

      {prompt && !playedAction && !reveal && !bossReveal && bossPresentations.length === 0 && oathCelebrations.length === 0 ? (
        <div className={`sim-modal-backdrop${tavern ? ' is-tavern' : ''}`}>
          <div aria-modal="true" aria-labelledby="game-prompt-title" aria-describedby="game-prompt-instructions" className="sim-modal" role="dialog">
            <ModalHeader id="game-prompt-title" title={copy.promptTitles[prompt.purpose]} onClose={prompt.optional ? () => send({ t: 'answer', option: null }) : undefined} closeLabel={tavern ? sim.noThanks : sim.skip} />
            <p className="sim-prompt-instructions" id="game-prompt-instructions">
              {fill(copy.prompts[prompt.purpose] ?? prompt.purpose, {
                count: Number(prompt.ctx.count ?? 0),
                n: Number(prompt.ctx.n ?? 0),
                left: Number(prompt.ctx.n ?? 0) - Number(prompt.ctx.paid ?? 0),
                old: Number(prompt.ctx.old ?? 0),
                fresh: Number(prompt.ctx.fresh ?? 0),
              })}
            </p>
            {tavern ? <p className="sim-note">{sim.tavernHint}</p> : null}
            <div className="sim-cards">
              {prompt.options.map((option, index) => {
                const cardId = option.cardId ?? (option.id.startsWith('OSS-CARD-') ? option.id : undefined)
                if (cardId) {
                  const target = tavern
                    ? zone(`tavern-${cardId}`, Boolean(fromHand), () => {
                        if (fromHand) tradeWith(cardId, fromHand)
                      })
                    : null
                  return (
                    <div
                      className={`sim-pick${target ? target.className : ''}`}
                      key={`${option.id}-${index}`}
                      onDragLeave={target?.onDragLeave}
                      onDragOver={target?.onDragOver}
                      onDrop={target?.onDrop}
                    >
                      <GameCard id={cardId} locale={locale} onInspect={(el) => inspect(cardId, el)} size="md" />
                      <button className="button button-primary" onClick={() => send({ t: 'answer', option: option.id })} type="button">
                        {sim.choose}
                      </button>
                    </div>
                  )
                }
                const label =
                  copy.options[option.id] ??
                  ((CLASS_NAMES as readonly string[]).includes(option.id) ? heroName('Classe', option.id) : option.id)
                return (
                  <button className={`button${option.id === 'flee' ? ' gb-flee-button' : ''}`} key={`${option.id}-${index}`} onClick={() => send({ t: 'answer', option: option.id })} type="button">
                    {option.id === 'flee' ? <FleeIcon /> : null}
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
            {prompt.optional ? (
              <button className="sim-link" onClick={() => send({ t: 'answer', option: null })} type="button">
                {tavern ? sim.noThanks : sim.skip}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FleeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 20h6V4h-6M3 12h12M7 8l-4 4 4 4" /><path d="M17 8v8" /></svg>
}

function HeroChoice({
  active,
  entry,
  label,
  onClick,
  gender = 'male',
}: {
  active: boolean
  entry: (typeof CARDS)[number] | undefined
  label: string
  onClick: () => void
  gender?: CardGender
}) {
  const art = entry ? getCardIllustration(entry, gender) : undefined
  return (
    <button aria-pressed={active} className={`sim-choice${active ? ' is-active' : ''}`} onClick={onClick} type="button">
      {art ? <img alt="" loading="lazy" src={art.src} /> : null}
      <span className="sim-choice-name">{label}</span>
      <span aria-hidden="true" className="sim-choice-check">{active ? '✓' : '+'}</span>
    </button>
  )
}

function Stat({ label, value, danger, title }: { label: string; value: string | number; danger?: boolean; title?: string }) {
  return (
    <div className={`sim-stat${danger ? ' is-danger' : ''}`} title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
