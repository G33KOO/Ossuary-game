import { CARD_SYMBOLS as TYPE_ICON } from '../utils/cardSymbols'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'
import { fill, soloCopy } from '../content/solo'
import { ARMOR_SLOTS, CARDS, CLASS_NAMES, RACE_NAMES, card } from '../game/data'
import type { ClassName, RaceName } from '../game/data'
import { BOSS_IDS, activeStatus, canManageHand, canChangeEquipment, canEquip, canPlayAction, canWeaponReroll, fleeBlocked, newGame, reduce } from '../game/engine'
import { loadGame, saveGame } from '../game/save'
import { bossEquipmentCardPower, computePlayerPower, computePower, equipmentCardPower, handLimit } from '../game/power'
import type { PowerBreakdown } from '../game/power'
import type { DiceRoll, GameAction, GameState, Prompt } from '../game/types'
import { useCardDialog } from '../hooks/useCardDialog'
import { localizeCard } from '../i18n/cardTranslations'
import { useLocale } from '../hooks/useLocale'
import { getCardIllustration, hasFemaleVariant } from '../utils/cardIllustration'
import type { CardGender } from '../utils/cardIllustration'
import { getClassIcon } from '../utils/cardClass'
import { OATH, oathCompleted } from '../game/oaths'
import { permanentDieBonus } from '../game/oaths'
import { Modal } from './Modal'
import { DropTarget } from './DropTarget'
import { GameCard, CardBack, Pile, Discard, DiscardGallery, Score } from './game-ui'
import { CombatResolution } from './CombatResolution'
import type { CombatBeat } from './CombatResolution'
import { DiceResults } from './DiceResults'
import type { EffectStage } from './EffectPresentation'
import { EffectPresentation } from './EffectPresentation'
import { HeroInventory } from './HeroInventory'
import { CombatRecap } from './CombatRecap'
import { LevelTimeline } from './LevelTimeline'
import { BossEnrage } from './BossEnrage'
import { TavernBoard } from './TavernBoard'
import { BoardChoice } from './BoardChoice'
import { DrawFlight } from './DrawFlight'
import { actionVisual } from '../game/actionVisual'
import { drawPresentations } from '../game/drawPresentations'
import type { ActionEffect, ActionTarget } from '../game/actionVisual'
import '../styles/solo-board.css'
import '../styles/immersion.css'
import '../styles/solo-mobile.css'
import '../styles/combat-feedback.css'

const ROLL_DELAY = 1100
const RESOLVE_DELAY = 150
const REVEAL_BASE = 1900
const REVEAL_STAGGER = 250

type Busy = 'rolling' | 'resolving' | 'boss' | 'flee' | null
type Drag = { id: string; from: 'hand' | 'equip' }
type Reveal = { seq: number; kind: 'loot' | 'monster'; cards: string[] }
type PlayedAction = { id: string; effect: ActionEffect; target: ActionTarget; seq: number; x: number; y: number; dx: number; dy: number; result: string; lines: GameState['log']; destroyed?: { id: string; x: number; y: number } }

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
      <span>{sim.yourPower}</span><strong aria-live="polite" key={power.total} className="gb-power-change">{power.total}</strong><span aria-hidden="true" className="gb-power-info">ⓘ</span>
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

function PlayerDie({ roll, count, modifier, sides, value, rolling, disabled, reasons, possible, modifiers, sim, onRoll }: {
  roll?: DiceRoll; count: number; modifier?: number; sides: number; value: number | null; rolling: boolean; disabled: boolean; reasons: string[]; possible: string; modifiers: string[]; sim: Record<string, string>; onRoll: () => void
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
  return <div ref={anchor} className={`gb-player-die-control${ready ? ' is-ready' : ''}`} tabIndex={disabled ? 0 : -1} aria-label={`D${sides}`} aria-describedby={open ? 'player-die-tooltip' : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }} onFocus={show} onBlur={() => setOpen(false)} onClick={() => { if (disabled) show() }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
    <button className="gb-player-die-button" type="button" disabled={disabled} onClick={() => { setOpen(false); onRoll() }} aria-label={sim.roll} aria-describedby={open ? 'player-die-tooltip' : undefined}><DiceResults roll={roll} count={count} modifier={modifier} sides={sides} value={value} rolling={rolling} ready={ready} compact sim={sim} />{ready ? <span className="gb-die-invitation" aria-hidden="true">{sim.dieInvite}</span> : null}</button>
    {open ? createPortal(<div className="gb-active-tooltip gb-die-tooltip" id="player-die-tooltip" role="tooltip" style={position}><strong>D{sides} · {sim.diePossible}</strong><p>{possible}</p><p>{sim.dieCommitment}</p>{roll ? <DiceResults roll={roll} value={value} modifier={modifier} sim={sim} /> : null}{modifiers.map((text, index) => <p className="gb-active-passive" key={index}>{text}</p>)}<div className={`gb-active-availability${disabled ? ' is-disabled' : ''}`}><strong>{disabled ? sim.dieUnavailable : sim.dieReady}</strong>{reasons.length ? <ul>{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</div></div>, document.body) : null}
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
  const [resolutionPreview, setResolutionPreview] = useState<GameState | null>(null)
  const [combatBeat, setCombatBeat] = useState<CombatBeat>('hero')
  const [busy, setBusy] = useState<Busy>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const pendingReveal = useRef<GameState | null>(null)
  const [drawDeferred, setDrawDeferred] = useState(false)
  const afterReveal = useRef<EffectStage[]>([])
  const [informationOpen, setInformationOpen] = useState(false)
  const [playedAction, setPlayedAction] = useState<PlayedAction | null>(null)
  const [bossPresentations, setBossPresentations] = useState<EffectStage[]>([])
  const [oathCelebrations, setOathCelebrations] = useState<string[]>([])
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [slotOver, setSlotOver] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState<'monster' | 'loot' | null>(null)
  const [bossReveal, setBossReveal] = useState<string | null>(null)
  const [bossDrawReady, setBossDrawReady] = useState(false)
  const [klass, setKlass] = useState<ClassName>('Guerrier')
  const [race, setRace] = useState<RaceName>('Humain')
  const [heroGender, setHeroGender] = useState<CardGender>('male')
  const timer = useRef<number | undefined>(undefined)
  const revealTimer = useRef<number | undefined>(undefined)
  const bossPresentationSeq = useRef(0)
  const actionAnimationTimer = useRef<number | undefined>(undefined)
  const actionAnimationSeq = useRef(0)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(revealTimer.current)
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
    const frames = drawPresentations(next.draws)
    if (!frames.length) return
    window.clearTimeout(revealTimer.current)
    const show = (index: number) => {
      const frame = frames[index]
      if (!frame) { setReveal(null); if (afterReveal.current.length) { setBossPresentations(afterReveal.current); afterReveal.current = [] } return }
      setReveal({ seq: next.drawSeq * 100 + index, ...frame })
      revealTimer.current = window.setTimeout(() => show(index + 1), REVEAL_BASE + frame.cards.length * REVEAL_STAGGER)
    }
    show(0)
  }

  const send = (action: GameAction) => {
    if (!gameRef.current) return
    const previous = gameRef.current
    const next = reduce(previous, action)
    const newlyCompleted = (next.completedOaths ?? []).filter((id) => !(previous.completedOaths ?? []).includes(id))
    if (newlyCompleted.length) setOathCelebrations((current) => [...current, ...newlyCompleted])
      if (!previous.combat?.bossId && next.combat?.bossId) {
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
      const arena = document.querySelector('.gb-arena')
      const table = tableRef.current
      if (arena && table) {
        const a = arena.getBoundingClientRect(), t = table.getBoundingClientRect()
        if (a.top < t.top || a.bottom > t.bottom) table.scrollTo({ top: table.scrollTop + a.top - t.top - 8, behavior: 'instant' })
      }
      const target = arena?.getBoundingClientRect()
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
      actionAnimationTimer.current = window.setTimeout(() => { setPlayedAction(null); if (next.draws.length > 0 && !pendingReveal.current) showReveal(next) }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 1800)
    }
    const resolved = newLogs.some((entry) => entry.code === 'resolved')
    const outcomeCodes = new Set(['victory', 'defeat', 'bossDefeated', 'bossLost', 'secondAssault', 'honorDuel'])
    if (resolved) { setResolutionPreview(previous); setCombatBeat('hero') }
    const stageCodes = new Set(['bossForce', 'bossAwakens', 'bossPlays', 'bossRolled', 'bossStack', 'bossDecree', 'bossDecreeCancel', 'bossSwap', 'bossAscension', 'bossRecovers', 'monsterRoll', 'monsterEffect', 'equipmentIgnored', 'souriantRolled', 'sansVisageRolled', 'fleeRolled', 'fled', 'fleeFailed', 'defeat', 'resolved', 'victory', 'greedRoll', 'executionRoll', 'mageReroll', 'rerolled', 'oathRerolled', 'armorDoubled', 'weaponSalvage', 'weaponHarvest', 'weaponRerolled', 'bossItemDestroyed', 'bossSalvage', 'merchantFavor', 'pestWaits', 'fournaiseNoOpponent'])
    const stages = newLogs.filter((entry) => stageCodes.has(entry.code) && !(resolved && outcomeCodes.has(entry.code))).map((entry) => ({
      id: typeof entry.params?.card === 'string' ? entry.params.card : next.combat?.bossId ?? previous.combat?.monsters[0] ?? undefined,
      lines: [entry, ...(entry.code === 'resolved' ? newLogs.filter((detail) => outcomeCodes.has(detail.code)) : []), ...(entry.code === 'bossPlays' ? newLogs.filter((detail) => detail.code === 'playerItemDestroyed') : [])], seq: ++bossPresentationSeq.current,
    }))
    const hasOutcome = newLogs.some((entry) => ['resolved', 'fleeRolled', 'fled', 'fleeFailed', 'defeat', 'victory', 'weaponHarvest', 'weaponSalvage'].includes(entry.code))
    if (hasOutcome && next.draws.length) {
      const arrivals = new Set(['monsterRoll', 'monsterEffect', 'souriantRolled'])
      afterReveal.current = stages.filter((stage) => arrivals.has(stage.lines[0].code))
      setBossPresentations(stages.filter((stage) => !arrivals.has(stage.lines[0].code)))
      pendingReveal.current = next
      setDrawDeferred(true)
    } else if (stages.length) setBossPresentations(stages)
    if (next.finalCombat && !previous.finalCombat) setRecapOpen(true)
    gameRef.current = next
    setGame(next)
    if (next.draws.length > 0 && !pendingReveal.current && !(action.t === 'playAction' && newLogs.some((entry) => entry.code === 'actionPlayed'))) showReveal(next)
  }

  const start = () => {
    window.clearTimeout(actionAnimationTimer.current)
    setPlayedAction(null)
    setResolutionPreview(null)
    window.clearTimeout(timer.current)
    window.clearTimeout(revealTimer.current)
    setBusy(null)
    pendingReveal.current = null
    setDrawDeferred(false)
    afterReveal.current = []
    setRecapOpen(false)
    setInventoryOpen(false)
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
    pendingReveal.current = null
    setDrawDeferred(false)
    afterReveal.current = []
    setRecapOpen(false)
    setInventoryOpen(false)
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

  const flee = () => delayed('flee', 350, { t: 'flee' })

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
    if (pendingReveal.current) { const next = pendingReveal.current; pendingReveal.current = null; setDrawDeferred(false); showReveal(next) }
    else if (busy === 'boss') runBossSequence()
  }

  const inspect = (id: string, element: HTMLElement, actions?: ReactNode) => {
    const current = game
    const weaponAction = current && !busy && canWeaponReroll(current, id) ? <button className="button button-primary" type="button" onClick={() => delayed('rolling', ROLL_DELAY, { t: 'weaponReroll', id })}>{sim.weaponReroll}</button> : undefined
    const harvestPrompt = current?.promptQueue[0]
    const harvestAction = current && card(id).name === 'Hache Fétiche à deux mains' && current.equipment.hands.includes(id)
      ? harvestPrompt?.purpose === 'weapon-loot' ? <button className="button button-primary" type="button" onClick={() => send({ t: 'answer', option: id })}>{sim.harvest}</button> : <p className="gb-card-use-reason">{sim.harvestWait}</p>
      : undefined
    openCard(card(id), undefined, element, actions ?? weaponAction ?? harvestAction)
  }

  const equipmentReason = (state: GameState, id: string) => {
    const entry = card(id)
    if (entry.type === 'Artefact de classe') {
      if (state.level < 10) return sim.artifactLevel
      if (!(entry.requirement ?? '').includes(`Classe : ${state.klass}`)) return sim.artifactClass
    }
    if (!['Armure', 'Arme', 'Artefact de classe'].includes(entry.type)) return undefined
    if (!canManageHand(state)) return sim.equipmentChoice
    if (!canChangeEquipment(state)) return sim.equipmentRolled
    return undefined
  }

  const formatLog = (entry: { code: string; params?: Record<string, string | number> }) => {
    if (entry.code === 'fled' && entry.params?.automatic === 1) return sim.fleeAuto
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

  const ended = game.phase === 'won' || game.phase === 'lost'
  const final = ended ? game.finalCombat : undefined
  const boardState = resolutionPreview ?? (final ? { ...game, combat: final.combat, equipment: final.equipment, level: final.level, completedOaths: final.completedOaths } : game)
  const combat = boardState.combat
  const monsterVictory = Boolean(resolutionPreview && bossPresentations[0]?.lines[0].code === 'resolved' && bossPresentations[0].lines.some((entry) => entry.code === 'victory'))
  const drawnLootIds = game.draws.filter(draw => draw.kind === 'loot').map(draw => draw.id)
  const pendingLootIds = new Set(reveal?.kind === 'monster' ? [] : reveal?.kind === 'loot' ? drawnLootIds.slice(Math.max(0, drawnLootIds.indexOf(reveal.cards[0]))) : drawDeferred || playedAction ? drawnLootIds : [])
  const pendingMonsterIds = new Set(!resolutionPreview && (reveal || playedAction || drawDeferred) ? game.draws.filter((draw) => draw.kind === 'monster').map((draw) => draw.id) : [])
  const power = resolutionPreview ? computePower(resolutionPreview) : final?.power ?? computePower(game)
  const prompt: Prompt | undefined = game.promptQueue[0]
  const preparation = game.phase === 'main' && !combat && game.endTurnPending
  const main = game.phase === 'main' && !combat && !game.endTurnPending
  const locked = busy !== null || playedAction !== null || bossReveal !== null || bossPresentations.length > 0 || oathCelebrations.length > 0 || Boolean(prompt) || reveal !== null || ended
  const handLocked = busy !== null || playedAction !== null || bossReveal !== null || bossPresentations.length > 0 || oathCelebrations.length > 0 || !canManageHand(game) || reveal !== null || ended
  const equipmentEditable = !handLocked && canChangeEquipment(game)
  const handActions = (id: string) => {
    const gear = ['Armure', 'Arme', 'Artefact de classe'].includes(card(id).type)
    const equipped = [...Object.values(game.equipment.armors), ...game.equipment.hands, game.equipment.artifact, game.equipment.extraArmor?.id].includes(id)
    if (equipped) return <button className="button" type="button" disabled={!equipmentEditable} onClick={() => { setInventoryOpen(false); send({ t: 'unequip', id }) }}>{sim.unequipBtn}</button>
    if (!game.hand.includes(id)) return undefined
    if (!gear && card(id).type !== 'Action') return undefined
    const reason = gear ? equipmentReason(game, id) : undefined
    return <>{prompt?.purpose === 'tavern-give' ? <button className="button button-primary" type="button" disabled={handLocked} onClick={() => { setInventoryOpen(false); send({ t: 'answer', option: id }) }}>{sim.tavernTrade}</button> : null}<button className="button" type="button" disabled={handLocked || !(gear ? canEquip(game, id) : canPlayAction(game, id))} onClick={() => { setInventoryOpen(false); send({ t: gear ? 'equip' : 'playAction', id }) }}>{gear ? sim.equipBtn : sim.play}</button>{reason ? <p className="gb-card-use-reason">{reason}</p> : null}</>
  }
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
  const diceCount = combat?.flags.includes('doubleDie') || combat?.flags.includes('wyrm') ? 2 : 1
  const dieBonus = (game.race === 'Elfe' ? 1 : 0) + permanentDieBonus(game)
  const summedDice = combat?.flags.includes('doubleDie') ? 2 : 1
  const dieMinimum = summedDice * (1 + dieBonus)
  const dieMaximum = summedDice * (game.dieSides + dieBonus)
  const possibleRolls = Array.from({ length: dieMaximum - dieMinimum + 1 }, (_, index) => dieMinimum + index).join(', ')
  const dieModifiers = [game.race === 'Elfe' ? sim.dieElfBonus : '', permanentDieBonus(game) ? sim.dieOathBonus : '', combat?.flags.includes('doubleDie') ? sim.dieDouble : '', combat?.flags.includes('wyrm') ? sim.dieWyrm : ''].filter(Boolean)
  const limit = handLimit(game)
  const bossUnlocked = game.level >= 10
  const tavern = prompt?.purpose === 'tavern' || prompt?.purpose === 'tavern-give'
  const choiceVisible = prompt && !tavern && prompt.purpose !== 'oath' && !playedAction && !reveal && !bossReveal && bossPresentations.length === 0 && oathCelebrations.length === 0
  const effectVisible = bossPresentations[0] && bossPresentations[0].lines[0].code !== 'resolved' && !bossReveal && !reveal && !playedAction
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

  const zone = (key: string, accepts: boolean, actions: GameAction[]) => ({ key, accepts, actions, over: over === key })
  const commitDrop = (actions: GameAction[]) => { setDrag(null); for (const action of actions) send(action) }

  const fromHand = drag?.from === 'hand' ? drag.id : null
  const fromEquip = drag?.from === 'equip' ? drag.id : null
  const equipZone = zone('equip', Boolean(fromHand && !handLocked && canEquip(game, fromHand)), fromHand ? [{ t: 'equip', id: fromHand }] : [])
  const playZone = zone('play', Boolean(fromHand && !handLocked && canPlayAction(game, fromHand)), fromHand ? [{ t: 'playAction', id: fromHand }] : [])
  const draggedAction = fromHand && !locked && canPlayAction(game, fromHand) ? card(fromHand).name : null
  const targetsOpponent = Boolean(combat && draggedAction && ['Faiblesse', 'Frénésie', 'Apaiser', 'Malchance', 'Dépossession', 'Brise-armure', 'Destruction', 'Corrosion', 'Exécution', 'Peur'].includes(draggedAction))
  const foeZone = zone('foe', targetsOpponent, fromHand ? [{ t: 'playAction', id: fromHand }] : [])
  const handZone = zone('hand', Boolean(fromEquip && equipmentEditable), fromEquip ? [{ t: 'unequip', id: fromEquip }] : [])

  const labels = { level: sim.levelPart, equip: sim.equipPart, bonus: sim.bonusPart, die: sim.diePart }
  const foeLabels = { ...labels, equip: combat?.kind === 'boss' ? sim.equipPart : sim.powerPart }
  const hero = (type: 'Classe' | 'Race', name: string) => heroCard(type, name)

  const slotClass = (key: string, slot: string) => {
    if (!fromHand || locked || !canEquip(game, fromHand) || !slotAccepts(slot, fromHand)) return ''
    return ` is-target${slotOver === key ? ' is-over' : ''}`
  }

  const gearIgnored = (id: string) => Boolean(combat?.ignoredEquipment?.includes(id) || combat?.flags.includes('ignoreAll') || (combat?.flags.includes('ignoreWeapons') && card(id).type === 'Arme') || (combat?.flags.includes('ignoreArmors') && card(id).type === 'Armure') || combat?.stolenArmor === id)

  const renderEquipped = (id: string | null | undefined, slot: string) =>
    id ? (
      <GameCard
        playerClass={game.klass}
        allWeaponMastery={oathCompleted(game, OATH.foreignIron)}
        equipmentPower={gearIgnored(id) ? 0 : equipmentCardPower(boardState, id)}
        neutralized={gearIgnored(id)}
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

  const bossOnBoard = bossReveal ? (
        <section className="gb-boss-draw gb-board-boss-draw" aria-labelledby="boss-draw-title"><h3 id="boss-draw-title">{sim.bossDrawTitle}</h3>
            <div className="gb-boss-draw-card">
              <div className="gb-boss-draw-back"><CardBack kind="boss" size="lg" /></div>
              <button className="gb-boss-draw-front" type="button" onClick={(event) => inspect(bossReveal, event.currentTarget)} aria-label={sim.inspect}>
                {getCardIllustration(card(bossReveal)) ? <img alt={localizeCard(card(bossReveal), locale).name} src={getCardIllustration(card(bossReveal))!.src} /> : <span>{localizeCard(card(bossReveal), locale).name}</span>}
              </button>
            </div>
            <div className="gb-boss-draw-info"><h3>{localizeCard(card(bossReveal), locale).name}</h3><p>{localizeCard(card(bossReveal), locale).text}</p></div>
            <button className="button button-primary gb-boss-draw-continue" disabled={!bossDrawReady} type="button" onClick={() => setBossReveal(null)}>{sim.nextAction} →</button>
          </section>
      ) : null

  return (
    <div className={`gb gb-full${combat?.kind === 'boss' ? ' gb-boss-battle' : ''}${resolutionPreview && bossPresentations[0]?.lines[0].code === 'resolved' ? ` gb-resolution-${combatBeat}` : ''}${playedAction ? ` gb-effect-${playedAction.effect} gb-effect-target-${playedAction.target}` : ''}`}>
      <div className="gb-hud">
        <LevelTimeline game={boardState} />
        {boardState.level >= 10 || boardState.bossPressure > 0 ? <BossEnrage count={boardState.bossPressure} sim={sim} className="gb-boss-enrage-mobile" /> : null}
        {ended && final && !resolutionPreview ? <button className="button gb-final-banner" type="button" onClick={() => setRecapOpen(true)}>{boardState.phase === 'won' ? sim.victoryTitle : sim.defeatTitle} · {sim.openRecap}</button> : null}
        <Stat label={sim.turn} value={boardState.turn} />
        <Stat label={sim.hand} value={`${boardState.hand.length}/${limit}`} />
        <button className="sim-link" onClick={reset} type="button">
          {sim.restart}
        </button>
        <nav className="gb-mobile-nav" aria-label={sim.mobileNavigation}>
          <button type="button" onClick={() => jumpTo('.gb-center')}>{sim.mobileCombat}</button>
          <button type="button" onClick={() => jumpTo('.gb-board')}>{sim.yourHero}</button>
          <button type="button" aria-haspopup="dialog" onClick={() => setInformationOpen(true)}>{sim.information}</button>
        </nav>
        {main && !locked ? <p className="gb-mobile-adventure-hint" role="status">{sim.adventure}</p> : null}
        {preparation && !locked ? <div className="gb-mobile-preparation"><span>{sim.preparation}</span><button className="button button-primary" type="button" onClick={() => send({ t: 'endTurn' })}>{sim.endTurn}</button></div> : null}
      </div>

      <div className="gb-table" ref={tableRef}>
        <div className="gb-side gb-side-left">
          <Pile
            count={boardState.monsterDeck.length}
            disabled={locked || !main}
            hint={sim.pickMonster}
            actionLabel={sim.fight}
            kind="monster"
            label={sim.pileMonster}
            onClick={() => send({ t: 'fightMonster' })}
          />
          <Discard count={boardState.monsterDiscard.length} label={sim.tableMonster} linkLabel={sim.discardPile} onOpen={() => setDiscardOpen('monster')} />
        </div>

        <div className="gb-center">
        <DropTarget as="section" className={`gb-arena${combat?.kind === 'monster' && (choiceVisible || effectVisible) ? ' gb-arena-with-context' : ''}`} target={playZone} onHover={setOver} onCommit={commitDrop}>
          {combat?.kind === 'monster' && (choiceVisible || effectVisible) ? <aside className="gb-combat-context" aria-label={sim.opponent}>
            <div className="gb-combat-context-cards">
              {combat.monsters.filter(id => !pendingMonsterIds.has(id)).map(id => <GameCard key={id} id={id} locale={locale} size="lg" onInspect={el => inspect(id, el)} />)}
            </div>
            {power ? <Score label={sim.opponent} parts={breakdownText(power.opponent, foeLabels)} side="foe" total={power.opponent.total} /> : null}
            {power ? <Score label={sim.yourPower} parts={breakdownText(power.player, labels)} side="you" total={power.player.total} /> : null}
          </aside> : null}
          {bossReveal ? bossOnBoard : reveal?.kind === 'monster' && !combat ? <div className="gb-monster-landing" aria-hidden="true" /> : effectVisible ? <EffectPresentation key={bossPresentations[0].seq} stage={bossPresentations[0]} locale={locale} sim={sim} formatLog={formatLog} inspect={inspect} onNext={nextBossPresentation} /> : choiceVisible ? <BoardChoice prompt={prompt} title={copy.promptTitles[prompt.purpose]} instructions={fill(copy.prompts[prompt.purpose] ?? prompt.purpose, { count: Number(prompt.ctx.count ?? 0), n: Number(prompt.ctx.n ?? 0), left: Number(prompt.ctx.n ?? 0) - (Array.isArray(prompt.ctx.paid) ? prompt.ctx.paid.length : Number(prompt.ctx.paid ?? 0)), old: Number(prompt.ctx.old ?? 0), fresh: Number(prompt.ctx.fresh ?? 0) })} locale={locale} sim={sim} inspect={inspect} answer={(option) => send({ t: 'answer', option })} label={(id) => copy.options[id] ?? ((CLASS_NAMES as readonly string[]).includes(id) ? heroName('Classe', id) : id)} /> : tavern && prompt && !playedAction && !reveal && !bossReveal && bossPresentations.length === 0 && oathCelebrations.length === 0 ? <TavernBoard prompt={prompt} locale={locale} sim={sim} instructions={copy.prompts.tavern} canTrade={game.hand.length > 0 && !handLocked} inspect={inspect} answer={(option) => send({ t: 'answer', option })} inventory={() => setInventoryOpen(true)} dragging={Boolean(fromHand)} trade={(offer) => { if (!fromHand) return; const actions: GameAction[] = prompt.purpose === 'tavern-give' ? [{ t: 'answer', option: 'tavern-back' }] : []; commitDrop([...actions, { t: 'answer', option: offer }, { t: 'answer', option: fromHand }]) }} /> : ended && !combat ? (
            <div className={`sim-end ${boardState.phase}`}>
              <h3>{boardState.phase === 'won' ? sim.victoryTitle : sim.defeatTitle}</h3>
              <p>{boardState.phase === 'won' ? sim.victoryText : sim.defeatText}</p>
              <p>
                {fill(sim.stats, { m: boardState.stats.monsters, d: boardState.stats.defeats, f: boardState.stats.flees, t: boardState.turn })}
              </p>
              <button className="button button-primary" onClick={reset} type="button">
                {sim.restart}
              </button>
            </div>
          ) : combat ? (
            <>
              <DropTarget className="gb-foe" target={foeZone} onHover={setOver} onCommit={commitDrop}>
                {targetsOpponent ? <span className="gb-target-label">{sim.dropOnOpponent}</span> : null}
                {combat.monsters.filter(() => !(monsterVictory && combatBeat === 'result')).map((id) => (
                  <div className={`gb-monster-encounter${pendingMonsterIds.has(id) ? ' is-awaiting-draw' : ''}`} key={id} inert={pendingMonsterIds.has(id)} aria-hidden={pendingMonsterIds.has(id) || undefined}>
                    <GameCard className={targetsOpponent ? 'gb-opponent-target' : ''} id={id} locale={locale} onInspect={(el) => inspect(id, el)} size="lg" />
                    {card(id).text && <div className="gb-monster-effect" key={`${id}-${boardState.turn}`}><span className="eyebrow">{sim.monsterEffect}</span><strong>{localizeCard(card(id), locale).name}</strong><p>{localizeCard(card(id), locale).text}</p>{combat.monsterRolls?.[id] ? <DiceResults roll={combat.monsterRolls[id]} compact sim={sim} /> : null}</div>}
                  </div>
                ))}
                {combat.kind === 'boss' && combat.bossId ? <div className="gb-boss-formation">
                  <div className="gb-boss-hand-zone">
                    <span className="gb-boss-zone-label">{sim.bossHandCount} : {combat.bossHand.length} {sim.cards}</span>
                    <div className="gb-foe-hand" style={{ '--boss-hand-count': combat.bossHand.length } as CSSProperties}>
                      {combat.bossHand.map((id, index) => <CardBack key={`${id}-${index}`} kind="boss" size="sm" />)}
                    </div>
                  </div>
                  <div className="gb-boss-core">
                    <GameCard className={targetsOpponent ? 'gb-opponent-target' : ''} id={combat.bossId} locale={locale} onInspect={(el) => inspect(combat.bossId as string, el)} size="lg" />
                    <div className="gb-boss-summary">
                      <h3>{localizeCard(card(combat.bossId), locale).name}</h3>
                      {power ? <div className="gb-opponent-status"><Score label={sim.opponent} parts={breakdownText(power.opponent, foeLabels)} side="foe" total={power.opponent.total} />{power.opponent.die !== null ? <DiceResults roll={combat.bossRoll} modifier={combat.bossDieModifier} rolling={false} sides={combat.bossSides} value={power.opponent.die} compact sim={sim} /> : null}</div> : null}
                      <details><summary>{sim.cardEffectTitle}</summary><p>{localizeCard(card(combat.bossId), locale).text}</p></details>
                    </div>
                  </div>
                  <div className="gb-boss-equipment-zone"><span className="gb-boss-zone-label">{sim.equipment}</span><div className="gb-foe-equip">
                    {combat.bossEquip.map(id => <GameCard id={id} key={id} equipmentPower={bossEquipmentCardPower(combat, id)} locale={locale} onInspect={el => inspect(id, el)} size="sm" />)}
                  </div></div>
                </div> : null}
                {combat.kind !== 'boss' && power && pendingMonsterIds.size === 0 && !(monsterVictory && combatBeat === 'result') ? <div className="gb-opponent-status"><Score label={sim.opponent} parts={breakdownText(power.opponent, foeLabels)} side="foe" total={power.opponent.total} />{power.opponent.die !== null ? <DiceResults roll={combat.bossRoll} modifier={combat.bossDieModifier} rolling={false} sides={6} value={power.opponent.die} compact sim={sim} /> : null}</div> : null}
              </DropTarget>


            </>
          ) : (
            <DropTarget className="gb-idle" target={playZone} onHover={setOver} onCommit={commitDrop}>
              {main && !locked ? <p className="gb-idle-title">{sim.adventure}</p> : null}
              <Pile
                count={BOSS_IDS.length}
                disabled={locked || !bossUnlocked}
                hint={bossUnlocked ? sim.boss : sim.bossLocked}
                kind="boss"
                label={bossUnlocked ? sim.boss : sim.bossLocked}
                onClick={() => send({ t: 'drawBoss' })}
              />
              {!bossUnlocked ? <p className="sim-note">{sim.bossWaits}</p> : null}
            </DropTarget>
          )}
        </DropTarget>
        </div>
{/* Contextual actions live on the table; hero power is shown only on the hero board. */}
        {(combat || tavern || preparation) ? <div className="gb-stage-actions" aria-label={sim.mobileCombat}>
          {bossPresentations[0]?.lines[0].code === 'resolved' && !bossReveal && !reveal && !playedAction ? <CombatResolution key={bossPresentations[0].seq} stage={bossPresentations[0]} sim={sim} formatLog={formatLog} onBeat={setCombatBeat} onContinue={() => { setResolutionPreview(null); nextBossPresentation() }} /> : combat ? <>
              <DropTarget className="gb-playzone" target={playZone} onHover={setOver} onCommit={commitDrop}>
                {busy ? <span className="gb-playzone-hint">{busy === 'rolling' ? sim.rolling : sim.resolving}</span> : null}
                <div className="gb-controls">
                  {combat.playerDie === 1 && !combat.oathRerollUsed && oathCompleted(boardState, OATH.misfortune) ? <button className="button" disabled={locked} type="button" onClick={() => delayed('rolling', ROLL_DELAY, { t: 'oathReroll' })}>{sim.oathReroll}</button> : null}
                  <button
                    className="button button-primary"
                    disabled={locked}
                    onClick={() => (combat.kind === 'boss' ? runBossSequence() : delayed('resolving', RESOLVE_DELAY, { t: 'resolve' }))}
                    type="button"
                  >
                    {combat.playerDie === null ? sim.resolveNoDie : sim.resolve}
                  </button>
                  {combat.kind === 'monster' && !combat.flags.includes('noFlee') ? (
                    <span className="gb-flee-control" tabIndex={fleeBlocked(game) ? 0 : undefined} title={fleeBlocked(game) ? sim.fleeCommitted : sim.fleeHint}>
                    <button className="button gb-flee-button" disabled={locked || fleeBlocked(game)} onClick={flee} type="button">
                      <FleeIcon />
                      <span>{sim.flee}</span><span className="gb-flee-threshold">D6 · 4+</span>
                    </button>
                    {fleeBlocked(game) ? <span className="gb-flee-tooltip" role="tooltip">{sim.fleeCommitted}</span> : null}
                    </span>
                  ) : null}
                  {combat.kind === 'monster' && !combat.flags.includes('noFlee') && (combat.hasRolled || combat.playerDie !== null) ? <p className="gb-flee-note">{sim.fleeCommitted}</p> : null}
                </div>
              </DropTarget>
          </> : <>
            <div className="gb-playzone"><div className="gb-controls">{tavern ? <>{prompt?.purpose === 'tavern-give' ? <button className="button" type="button" disabled={handLocked} onClick={() => send({ t: 'answer', option: 'tavern-back' })}>{sim.tavernBack}</button> : null}<button className="button button-primary" type="button" disabled={handLocked} onClick={() => { if (prompt?.purpose === 'tavern-give') send({ t: 'answer', option: 'tavern-back' }); send({ t: 'answer', option: null }) }}>{sim.noThanks}</button></> : preparation ? <><span className="gb-preparation-hint">{sim.preparation}</span><button className="button button-primary" disabled={locked} type="button" onClick={() => send({ t: 'endTurn' })}>{sim.endTurn}</button></> : null}</div></div>
          </>}
        </div> : null}
        <section className="gb-board" style={{ '--board-card-count': 9 + (boardState.retainedMonsters?.length ?? 0) + (boardState.oaths?.length ?? 0) + (boardState.equipment.extraArmor ? 1 : 0), '--hero-card-count': 2 + (boardState.retainedMonsters?.length ?? 0) + (boardState.oaths?.length ?? 0) } as CSSProperties}>
          <h3>{sim.equipment}</h3>
          <div className="gb-board-body">
            <section className="gb-board-group gb-native-group" aria-labelledby="board-hero-title">
            <div className="gb-hero-level-row"><div className="gb-level" title={sim.level}><span className="gb-level-label">{sim.level}</span><span className="gb-level-value"><strong>{boardState.level}</strong><span className="gb-level-max">/10</span></span></div></div>
            <h4 id="board-hero-title">{sim.yourHero}</h4>
            <div className="gb-heroes">
              {(['Race', 'Classe'] as const).map((kind) => {
                const entry = hero(kind, kind === 'Race' ? boardState.race : boardState.klass) as { id: string } | undefined
                if (!entry) return null
                return (
                  <div className="gb-slot" key={kind}>
                    <span className="gb-slot-label">{kind === 'Race' ? sim.raceLabel : sim.classLabel}</span>
                    <GameCard id={entry.id} locale={locale} onInspect={(el) => inspect(entry.id, el)} size="sm" />
                  </div>
                )
              })}
              {(boardState.oaths ?? []).map((id) => (
                <div className="gb-slot" key={id}>
                  <span className="gb-slot-label">{localizeCard(card(id), locale).type}{oathCompleted(boardState, id) ? ' ✓' : ''}</span>
                  <GameCard className={oathCompleted(boardState, id) ? 'gb-oath-completed' : ''} id={id} locale={locale} onInspect={(el) => inspect(id, el)} size="sm" />
                </div>
              ))}
              {(boardState.retainedMonsters ?? []).map((id) => <div className="gb-slot" key={id}><span className="gb-slot-label">{fill(sim.tradesRemaining, { count: 2 })}</span><GameCard id={id} locale={locale} size="sm" onInspect={(el) => inspect(id, el)} /></div>)}
            </div>
            </section>
            <DropTarget as="section" className="gb-board-group gb-equipment-group" labelledBy="board-equipment-title" target={equipZone} onHover={setOver} onCommit={commitDrop}>
            <div className="gb-player-combat-status">
              <HeroPower power={power?.player ?? computePlayerPower(boardState)} sim={sim} />
              <PlayerDie roll={combat?.playerRoll} count={diceCount} modifier={combat?.playerDieModifier ?? dieBonus} sides={boardState.dieSides} value={combat?.playerDie ?? null} rolling={busy === 'rolling'} disabled={locked || !combat || combat.playerDie !== null} reasons={dieReasons} possible={possibleRolls} modifiers={dieModifiers} sim={sim} onRoll={() => delayed('rolling', ROLL_DELAY, { t: 'roll' })} />
              <ClassActive klass={status.klass} name={heroName('Classe', status.klass)} effect={activeEffect} passive={fill(sim.classPassive, { klass: heroName('Classe', boardState.klass) })} reasons={activeReasons} disabled={locked || !status.available} sim={sim} onActivate={() => send({ t: 'useActive' })} />
            </div>
            <h4 id="board-equipment-title">{sim.equipment}</h4>
            <div className="gb-slots">
              {ARMOR_SLOTS.map((slot) => (
                <div className={`gb-slot${slotClass(slot, slot)}`} key={slot} onDragEnter={() => setSlotOver(slot)} onDragOver={() => setSlotOver(slot)}>
                  <span className="gb-slot-label">{slot}</span>
                  {renderEquipped(boardState.equipment.armors[slot], slot)}
                </div>
              ))}
              {boardState.equipment.extraArmor ? <div className={`gb-slot${slotClass('extra-armor', boardState.equipment.extraArmor.slot)}`} onDragEnter={() => setSlotOver('extra-armor')} onDragOver={() => setSlotOver('extra-armor')}><span className="gb-slot-label">{boardState.equipment.extraArmor.slot} · 2</span>{renderEquipped(boardState.equipment.extraArmor.id, boardState.equipment.extraArmor.slot)}</div> : null}
              {[0, 1].map((index) => {
                const twoHanded = boardState.equipment.hands.length === 1 && card(boardState.equipment.hands[0]).subtype === 'Deux mains'
                return (
                  <div className={`gb-slot${slotClass(`hand-${index}`, 'hand')}`} key={`hand-${index}`} onDragEnter={() => setSlotOver(`hand-${index}`)} onDragOver={() => setSlotOver(`hand-${index}`)}>
                    <span className="gb-slot-label">
                      {sim.weapons} {index + 1}
                    </span>
                    {twoHanded && index === 1 ? <div className="gb-two-handed-copy"><GameCard id={boardState.equipment.hands[0]} allWeaponMastery={oathCompleted(boardState, OATH.foreignIron)} equipmentPower={gearIgnored(boardState.equipment.hands[0]) ? 0 : equipmentCardPower(boardState, boardState.equipment.hands[0])} neutralized={gearIgnored(boardState.equipment.hands[0])} playerClass={boardState.klass} locale={locale} onInspect={(el) => inspect(boardState.equipment.hands[0], el)} size="sm" /></div> : renderEquipped(boardState.equipment.hands[index], 'hand')}
                  </div>
                )
              })}
              <div className={`gb-slot${slotClass('artifact', 'artifact')}`} onDragEnter={() => setSlotOver('artifact')} onDragOver={() => setSlotOver('artifact')}>
                <span className="gb-slot-label">{sim.artifact}</span>
                {renderEquipped(boardState.equipment.artifact, 'artifact')}
              </div>
            </div>
            </DropTarget>
          </div>
          <p className="gb-board-hint">{sim.dropEquip}</p>
        </section>

        <div className="gb-side gb-side-right">
          <Pile
            count={boardState.lootDeck.length}
            disabled={locked || !main}
            hint={sim.pickLoot}
            actionLabel={boardState.race === 'Nain' ? sim.drawLootNain : sim.drawLoot}
            kind="loot"
            label={sim.pileLoot}
            onClick={() => send({ t: 'drawLoot' })}
          />
          <Discard count={boardState.lootDiscard.length} label={sim.tableLoot} linkLabel={sim.discardPile} onOpen={() => setDiscardOpen('loot')} />
        </div>
      </div>

      <DropTarget className="gb-dock" target={handZone} onHover={setOver} onCommit={commitDrop}>
        <span className="gb-dock-label">
          {sim.handDock} · {boardState.hand.length}/{limit}
          {drag?.from === 'equip' ? ` — ${sim.dropHand}` : ''}
        </span>
        <div className="gb-hand">
          {boardState.hand.map((id, index) => {
            if (pendingLootIds.has(id)) return <div className="gb-card-wrap size-hand gb-pending-hand-slot" data-card-id={id} aria-hidden="true" key={`${id}-${index}`} style={{ '--i': index, '--n': boardState.hand.length } as CSSProperties} />
            const entry = card(id)
            const isGear = entry.type === 'Armure' || entry.type === 'Arme' || entry.type === 'Artefact de classe'
            const reason = isGear ? equipmentReason(boardState, id) : undefined
            const actions = handActions(id)
            return (
              <GameCard
                className={drag?.id === id ? 'is-dragging' : ''}
                unavailableReason={reason}
                playerClass={boardState.klass}
                allWeaponMastery={oathCompleted(boardState, OATH.foreignIron)}
                id={id}
                key={`${id}-${index}`}
                locale={locale}
                onInspect={(el) => inspect(id, el, actions)}
                size="hand"
                mobileActions={actions}
                style={{ '--i': index, '--n': boardState.hand.length } as CSSProperties}
                {...(handDraggable ? dragFrom('hand', id) : {})}
              />
            )
          })}
        </div>
      </DropTarget>

      {reveal ? <DrawFlight key={reveal.seq} kind={reveal.kind} cards={reveal.cards} locale={locale} /> : null}

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

      {inventoryOpen ? <HeroInventory game={boardState} locale={locale} sim={sim} inspect={(id, el) => inspect(id, el, handActions(id))} actions={handActions} onClose={() => setInventoryOpen(false)} /> : null}
      {recapOpen && final && !bossPresentations.length && !playedAction && !reveal && !bossReveal && !oathCelebrations.length ? <CombatRecap final={final} locale={locale} sim={sim} inspect={inspect} onClose={() => setRecapOpen(false)} /> : null}

      {discardOpen ? <DiscardGallery ids={discardOpen === 'monster' ? game.monsterDiscard : game.lootDiscard} title={discardOpen === 'monster' ? sim.tableMonster : sim.tableLoot} locale={locale} closeLabel={sim.close} onClose={() => setDiscardOpen(null)} onInspect={inspect} /> : null}


      {informationOpen ? <Modal id="game-information-title" title={sim.information} onClose={() => setInformationOpen(false)} closeLabel={sim.close} className="gb-information-modal">
        <LevelTimeline game={game} />
        <div className="gb-information-actions">
          <button className="button" type="button" onClick={() => { setInformationOpen(false); setDiscardOpen('monster') }}>{sim.tableMonster} · {game.monsterDiscard.length}</button>
          <button className="button" type="button" onClick={() => { setInformationOpen(false); setDiscardOpen('loot') }}>{sim.tableLoot} · {game.lootDiscard.length}</button>
        </div>
      </Modal> : null}

      {prompt && prompt.purpose === 'oath' && !playedAction && !reveal && !bossReveal && bossPresentations.length === 0 && oathCelebrations.length === 0 ? (
        <Modal id="game-prompt-title" title={copy.promptTitles[prompt.purpose]} describedBy="game-prompt-instructions" className="gb-choice-modal" onClose={prompt.optional ? () => send({ t: 'answer', option: null }) : undefined} closeLabel={sim.skip}>
            <p className="sim-prompt-instructions" id="game-prompt-instructions">
              {fill(copy.prompts[prompt.purpose] ?? prompt.purpose, {
                count: Number(prompt.ctx.count ?? 0),
                n: Number(prompt.ctx.n ?? 0),
                left: Number(prompt.ctx.n ?? 0) - Number(prompt.ctx.paid ?? 0),
                old: Number(prompt.ctx.old ?? 0),
                fresh: Number(prompt.ctx.fresh ?? 0),
              })}
            </p>
            <div className="sim-cards">
              {prompt.options.map((option, index) => {
                if (option.id === 'tavern-back') return null
                const cardId = option.cardId ?? (option.id.startsWith('OSS-CARD-') ? option.id : undefined)
                if (cardId) {
                  return (
                    <DropTarget className="sim-pick" target={null} key={`${option.id}-${index}`} onHover={setOver} onCommit={commitDrop}>
                      <GameCard id={cardId} locale={locale} onInspect={(el) => inspect(cardId, el)} size="md" />
                      <button className="button button-primary" onClick={() => send({ t: 'answer', option: option.id })} type="button">
                        {prompt.purpose === 'weapon-loot' ? sim.harvest : sim.choose}
                      </button>
                    </DropTarget>
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
                {sim.skip}
              </button>
            ) : null}
          </Modal>
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
