import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, ReactNode } from 'react'
import { fill, soloCopy } from '../content/solo'
import { ARMOR_SLOTS, CARDS, CLASS_NAMES, RACE_NAMES, card } from '../game/data'
import type { ClassName, RaceName } from '../game/data'
import { BOSS_IDS, activeStatus, canEquip, canPlayAction, fleeBlocked, newGame, reduce } from '../game/engine'
import { loadGame, saveGame } from '../game/save'
import { computePower, handLimit } from '../game/power'
import type { PowerBreakdown } from '../game/power'
import type { GameAction, GameState, Prompt } from '../game/types'
import { useCardDialog } from '../hooks/useCardDialog'
import { localizeCard } from '../i18n/cardTranslations'
import type { Locale } from '../i18n/LocaleProvider'
import { useLocale } from '../i18n/LocaleProvider'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import '../styles/solo-board.css'
import '../styles/immersion.css'

const ROLL_DELAY = 1100
const RESOLVE_DELAY = 1300
const BOSS_STEP_DELAY = 1300
const REVEAL_BASE = 1900
const REVEAL_STAGGER = 250

type Busy = 'rolling' | 'resolving' | 'boss' | null
type Drag = { id: string; from: 'hand' | 'equip' }
type Reveal = { seq: number; kind: 'loot' | 'monster'; cards: string[] }

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
  return (
    <div
      className={`gb-card-wrap size-${size} ${className}`}
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
        title={localized.name}
        type="button"
      >
        <span aria-hidden="true" className="gb-art">
          {art ? <img alt="" draggable={false} loading="lazy" src={art.src} /> : <span>{TYPE_ICON[entry.type] ?? '✦'}</span>}
        </span>
        <span aria-hidden="true" className="gb-type">
          {TYPE_ICON[entry.type] ?? '✦'}
        </span>
        {entry.value ? <span className="gb-orb">{entry.value}</span> : null}
        <span className="gb-name">{localized.name}</span>
      </button>
      {actions ? <div className="gb-card-actions">{actions}</div> : null}
    </div>
  )
}

function CardBack({ kind, size = 'md' }: { kind: 'loot' | 'monster' | 'boss'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span aria-hidden="true" className={`gb-back kind-${kind} size-${size}`}>
      <span>{kind === 'loot' ? '✦' : kind === 'monster' ? '☠' : '♜'}</span>
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
}: {
  kind: 'loot' | 'monster' | 'boss'
  count: number
  label: string
  hint?: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button className={`gb-pile kind-${kind}`} disabled={disabled || !onClick} onClick={onClick} title={hint} type="button">
      <span className="gb-pile-stack">
        <CardBack kind={kind} />
        <CardBack kind={kind} />
        <CardBack kind={kind} />
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
  onInspect,
}: {
  top: string | undefined
  count: number
  label: string
  locale: Locale
  onInspect: (id: string, element: HTMLElement) => void
}) {
  return (
    <div className="gb-discard">
      {top ? (
        <GameCard id={top} locale={locale} onInspect={(element) => onInspect(top, element)} size="sm" />
      ) : (
        <span className="gb-discard-empty" />
      )}
      <span className="gb-pile-label">
        {label} · {count}
      </span>
    </div>
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
        {label} · D{sides}
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

function breakdownText(b: PowerBreakdown, labels: { level: string; equip: string; bonus: string; die: string }) {
  const parts: string[] = []
  if (b.level) parts.push(`${labels.level} ${b.level}`)
  parts.push(`${labels.equip} ${b.equipment}`)
  if (b.bonus) parts.push(`${labels.bonus} ${b.bonus > 0 ? '+' : ''}${b.bonus}`)
  if (b.die !== null) parts.push(`${labels.die} ${b.die}`)
  return parts.join(' · ')
}

export function SoloBoard({ onPlayingChange }: { onPlayingChange?: (playing: boolean) => void }) {
  const { locale } = useLocale()
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
  const gameRef = useRef<GameState | null>(game)

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
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [slotOver, setSlotOver] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [fleeNote, setFleeNote] = useState<string | null>(null)
  const [bossPicker, setBossPicker] = useState(false)
  const [klass, setKlass] = useState<ClassName>('Guerrier')
  const [race, setRace] = useState<RaceName>('Humain')
  const timer = useRef<number | undefined>(undefined)
  const revealTimer = useRef<number | undefined>(undefined)
  const fleeNoteTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(revealTimer.current)
      window.clearTimeout(fleeNoteTimer.current)
    },
    [],
  )

  const heroName = (type: 'Classe' | 'Race', name: string) => {
    const entry = heroCard(type, name)
    return entry ? localizeCard(entry, locale).name : name
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
    const next = reduce(gameRef.current, action)
    gameRef.current = next
    setGame(next)
    if (next.draws.length > 0) showReveal(next)
  }

  const start = () => {
    window.clearTimeout(timer.current)
    window.clearTimeout(revealTimer.current)
    setBusy(null)
    setReveal(null)
    setBossPicker(false)
    gameRef.current = newGame(klass, race)
    setGame(gameRef.current)
  }

  const reset = () => {
    window.clearTimeout(timer.current)
    window.clearTimeout(revealTimer.current)
    setBusy(null)
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
    setBusy('boss')
    const tick = () => {
      const current = gameRef.current
      if (!current || !current.combat || current.combat.kind !== 'boss' || current.promptQueue.length > 0) {
        setBusy(null)
        return
      }
      send({ t: 'bossStep' })
      timer.current = window.setTimeout(tick, BOSS_STEP_DELAY)
    }
    timer.current = window.setTimeout(tick, 600)
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

  const logLines = useMemo(() => (game ? game.log.slice(-40).reverse() : []), [game])

  if (!game) {
    return (
      <div className="sim-setup">
        <p className="sim-intro">{sim.intro}</p>
        <h3>{sim.chooseClass}</h3>
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
        <h3>{sim.chooseRace}</h3>
        <div className="sim-choice-grid">
          {RACE_NAMES.map((name) => (
            <HeroChoice
              active={race === name}
              entry={heroCard('Race', name)}
              key={name}
              label={heroName('Race', name)}
              onClick={() => setRace(name)}
            />
          ))}
        </div>
        <button className="button button-primary" onClick={start} type="button">
          {sim.start}
        </button>
      </div>
    )
  }

  const combat = game.combat
  const power = computePower(game)
  const prompt: Prompt | undefined = game.promptQueue[0]
  const ended = game.phase === 'won' || game.phase === 'lost'
  const main = game.phase === 'main' && !combat
  const locked = busy !== null || Boolean(prompt) || reveal !== null || ended
  const status = activeStatus(game)
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
  const handDraggable = busy === null && reveal === null && !ended && (!prompt || tavern)

  const zone = (key: string, accepts: boolean, onDrop: () => void) => ({
    className: `${accepts && drag ? ' is-target' : ''}${over === key && accepts ? ' is-over' : ''}`,
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((current) => (current === key ? null : current))
    },
    onDragOver: (event: DragEvent) => {
      if (!accepts) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (over !== key) setOver(key)
    },
    onDrop: (event: DragEvent) => {
      if (!accepts) return
      event.preventDefault()
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
  const handZone = zone('hand', Boolean(fromEquip && main && !locked), () => {
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
        id={id}
        locale={locale}
        onInspect={(element) => inspect(id, element)}
        size="sm"
        {...(main && !locked ? dragFrom('equip', id) : {})}
        actions={
          main && !locked ? (
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
    <div className="gb gb-full">
      <div className="gb-hud">
        {fleeNote ? <div className="gb-toast">{fleeNote}</div> : null}
        <div className="gb-level" title={sim.level}>
          <span className="gb-level-label">{sim.level}</span>
          <strong>{game.level}</strong>
          <span className="gb-level-max">/10</span>
        </div>
        {(game.oaths ?? []).map((id) => (
          <button className="gb-oath" key={id} onClick={(event) => inspect(id, event.currentTarget)} type="button">
            ✳ {localizeCard(card(id), locale).name}
          </button>
        ))}
        <Stat label={sim.turn} value={game.turn} />
        <Stat label={sim.die} value={`D${game.dieSides}`} />
        <Stat label={sim.hand} value={`${game.hand.length}/${limit}`} />
        {bossUnlocked ? (
          <Stat danger label={sim.pressure} title={fill(sim.pressureHint, { n: game.bossPressure })} value={`+${game.bossPressure}`} />
        ) : null}
        <span className="gb-hero-line">
          {heroName('Race', game.race)} · {heroName('Classe', game.klass)}
          {game.mimic ? ` → ${heroName('Classe', game.mimic)}` : ''}
        </span>
        <button className="sim-link" onClick={reset} type="button">
          {sim.restart}
        </button>
      </div>

      <div className="gb-table">
        <div className="gb-side gb-side-left">
          <Pile
            count={game.monsterDeck.length}
            disabled={locked || !main}
            hint={sim.pickMonster}
            kind="monster"
            label={sim.pileMonster}
            onClick={() => send({ t: 'fightMonster' })}
          />
          <Discard count={game.monsterDiscard.length} label={sim.tableMonster} locale={locale} onInspect={inspect} top={monsterTop} />
        </div>

        <div className="gb-center">
        <section className="gb-arena">
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
              <div className="gb-foe">
                {combat.kind === 'boss' && combat.bossId ? (
                  <GameCard id={combat.bossId} locale={locale} onInspect={(el) => inspect(combat.bossId as string, el)} size="lg" />
                ) : null}
                {combat.monsters.map((id) => (
                  <GameCard id={id} key={id} locale={locale} onInspect={(el) => inspect(id, el)} size="lg" />
                ))}
                {combat.kind === 'boss' ? (
                  <div className="gb-foe-gear">
                    <div className="gb-foe-equip">
                      {combat.bossEquip.map((id) => (
                        <GameCard id={id} key={id} locale={locale} onInspect={(el) => inspect(id, el)} size="sm" />
                      ))}
                    </div>
                    <div className="gb-foe-hand" title={`${sim.bossHandCount} : ${combat.bossHand.length}`}>
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
                    <Die label={sim.you} rolling={busy === 'rolling'} sides={game.dieSides} value={combat.playerDie} />
                    {power.opponent.die !== null ? (
                      <Die label={sim.opponent} rolling={false} sides={combat.kind === 'boss' ? combat.bossSides : 6} value={power.opponent.die} />
                    ) : null}
                  </div>
                  <Score label={sim.opponent} parts={breakdownText(power.opponent, foeLabels)} side="foe" total={power.opponent.total} />
                </div>
              ) : null}

              <div className={`gb-playzone${playZone.className}`} onDragLeave={playZone.onDragLeave} onDragOver={playZone.onDragOver} onDrop={playZone.onDrop}>
                <span className="gb-playzone-hint">{busy ? (busy === 'rolling' ? sim.rolling : sim.resolving) : sim.dropPlay}</span>
                <div className="gb-controls">
                  {combat.playerDie === null ? (
                    <button className="button button-primary" disabled={locked} onClick={() => delayed('rolling', ROLL_DELAY, { t: 'roll' })} type="button">
                      {sim.roll}
                    </button>
                  ) : null}
                  <button
                    className="button button-primary"
                    disabled={locked}
                    onClick={() => (combat.kind === 'boss' ? runBossSequence() : delayed('resolving', RESOLVE_DELAY, { t: 'resolve' }))}
                    type="button"
                  >
                    {combat.playerDie === null ? sim.resolveNoDie : sim.resolve}
                  </button>
                  {!fleeBlocked(game) ? (
                    <button className="button" disabled={locked} onClick={flee} title={sim.fleeHint} type="button">
                      {sim.flee} · D6 4+
                    </button>
                  ) : null}
                  <button
                    className="button"
                    disabled={locked || !status.available}
                    onClick={() => send({ t: 'useActive' })}
                    title={sim[`needs_${status.klass}`]}
                    type="button"
                  >
                    {sim.active} · {heroName('Classe', status.klass)}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={`gb-idle${playZone.className}`} onDragLeave={playZone.onDragLeave} onDragOver={playZone.onDragOver} onDrop={playZone.onDrop}>
              <p className="gb-idle-title">{sim.adventure}</p>
              <span className="gb-playzone-hint">{sim.dropPlay}</span>
              <div className="gb-idle-actions">
                <button className="button button-primary" disabled={locked} onClick={() => send({ t: 'fightMonster' })} type="button">
                  {sim.fight}
                </button>
                <button className="button button-primary" disabled={locked} onClick={() => send({ t: 'drawLoot' })} type="button">
                  {game.race === 'Nain' ? sim.drawLootNain : sim.drawLoot}
                </button>
                <button
                  className="button"
                  disabled={locked || !status.available}
                  onClick={() => send({ t: 'useActive' })}
                  title={sim[`needs_${status.klass}`]}
                  type="button"
                >
                  {sim.active} · {heroName('Classe', status.klass)}
                </button>
              </div>
              <Pile
                count={BOSS_IDS.length}
                disabled={locked || !bossUnlocked}
                hint={bossUnlocked ? sim.boss : sim.bossLocked}
                kind="boss"
                label={bossUnlocked ? sim.boss : sim.bossLocked}
                onClick={() => setBossPicker(true)}
              />
              {!bossUnlocked ? <p className="sim-note">{sim.bossWaits}</p> : null}
            </div>
          )}
        </section>

        <section
          className="gb-board"
          onDragLeave={equipZone.onDragLeave}
          onDragOver={equipZone.onDragOver}
          onDrop={equipZone.onDrop}
        >
          <h3>{sim.equipment}</h3>
          <div className="gb-board-body">
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
            </div>
            <div className="gb-slots">
              {ARMOR_SLOTS.map((slot) => (
                <div className={`gb-slot${slotClass(slot, slot)}`} key={slot} onDragEnter={() => setSlotOver(slot)} onDragOver={() => setSlotOver(slot)}>
                  <span className="gb-slot-label">{slot}</span>
                  {renderEquipped(game.equipment.armors[slot], slot)}
                </div>
              ))}
              {[0, 1].map((index) => {
                const twoHanded = game.equipment.hands.length === 1 && card(game.equipment.hands[0]).subtype === 'Deux mains'
                return (
                  <div className={`gb-slot${slotClass(`hand-${index}`, 'hand')}`} key={`hand-${index}`} onDragEnter={() => setSlotOver(`hand-${index}`)} onDragOver={() => setSlotOver(`hand-${index}`)}>
                    <span className="gb-slot-label">
                      {sim.weapons} {index + 1}
                    </span>
                    {twoHanded && index === 1 ? <span className="gb-slot-empty">↑</span> : renderEquipped(game.equipment.hands[index], 'hand')}
                  </div>
                )
              })}
              <div className={`gb-slot${slotClass('artifact', 'artifact')}`} onDragEnter={() => setSlotOver('artifact')} onDragOver={() => setSlotOver('artifact')}>
                <span className="gb-slot-label">{sim.artifact}</span>
                {renderEquipped(game.equipment.artifact, 'artifact')}
              </div>
            </div>
          </div>
          <p className="gb-board-hint">{sim.dropEquip}</p>
        </section>
        </div>

        <div className="gb-side gb-side-right">
          <Pile
            count={game.lootDeck.length}
            disabled={locked || !main}
            hint={sim.pickLoot}
            kind="loot"
            label={sim.pileLoot}
            onClick={() => send({ t: 'drawLoot' })}
          />
          <Discard count={game.lootDiscard.length} label={sim.tableLoot} locale={locale} onInspect={inspect} top={lootTop} />
          <button className="button gb-log-btn" onClick={() => setLogOpen(true)} type="button">
            📜 {sim.showLog}
          </button>
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
                id={id}
                key={`${id}-${index}`}
                locale={locale}
                onInspect={(el) => inspect(id, el, actions)}
                size="hand"
                style={{ '--i': index, '--n': game.hand.length } as CSSProperties}
                {...(handDraggable ? dragFrom('hand', id) : {})}
              />
            )
          })}
        </div>
      </div>

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

      {logOpen ? (
        <div className="sim-modal-backdrop" onClick={() => setLogOpen(false)}>
          <div aria-modal="true" className="sim-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <p className="sim-modal-title">{sim.log}</p>
            <ol className="sim-log gb-log-full">
              {logLines.map((entry, index) => (
                <li className={index === 0 ? 'is-latest' : undefined} key={game.log.length - index}>
                  {formatLog(entry)}
                </li>
              ))}
            </ol>
            <button className="button" onClick={() => setLogOpen(false)} type="button">
              {sim.close}
            </button>
          </div>
        </div>
      ) : null}

      {bossPicker && main ? (
        <div className="sim-modal-backdrop">
          <div aria-modal="true" className="sim-modal" role="dialog">
            <p className="sim-modal-title">{sim.chooseBoss}</p>
            <div className="sim-cards">
              {BOSS_IDS.map((id) => (
                <div className="sim-pick" key={id}>
                  <GameCard id={id} locale={locale} onInspect={(el) => inspect(id, el)} size="md" />
                  <button
                    className="button button-primary"
                    onClick={() => {
                      setBossPicker(false)
                      send({ t: 'challengeBoss', bossId: id })
                    }}
                    type="button"
                  >
                    {sim.boss}
                  </button>
                </div>
              ))}
            </div>
            <button className="sim-link" onClick={() => setBossPicker(false)} type="button">
              {sim.skip}
            </button>
          </div>
        </div>
      ) : null}

      {prompt && !reveal ? (
        <div className={`sim-modal-backdrop${tavern ? ' is-tavern' : ''}`}>
          <div aria-modal="true" className="sim-modal" role="dialog">
            <p className="sim-modal-title">
              {tavern ? `${sim.tavernTitle} — ` : ''}
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
                  <button className="button" key={`${option.id}-${index}`} onClick={() => send({ t: 'answer', option: option.id })} type="button">
                    {label}
                  </button>
                )
              })}
            </div>
            {prompt.optional ? (
              <button className="sim-link" onClick={() => send({ t: 'answer', option: null })} type="button">
                {sim.skip}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HeroChoice({
  active,
  entry,
  label,
  onClick,
}: {
  active: boolean
  entry: (typeof CARDS)[number] | undefined
  label: string
  onClick: () => void
}) {
  const art = entry ? getCardIllustration(entry) : undefined
  return (
    <button aria-pressed={active} className={`sim-choice${active ? ' is-active' : ''}`} onClick={onClick} type="button">
      {art ? <img alt="" loading="lazy" src={art.src} /> : null}
      <span>{label}</span>
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
