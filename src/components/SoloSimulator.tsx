import { useEffect, useMemo, useRef, useState } from 'react'
import { fill, soloCopy } from '../content/solo'
import { ARMOR_SLOTS, CARDS, CLASS_NAMES, RACE_NAMES, card } from '../game/data'
import type { ClassName, RaceName } from '../game/data'
import { BOSS_IDS, activeStatus, canEquip, canPlayAction, fleeBlocked, newGame, reduce } from '../game/engine'
import { computePower, handLimit } from '../game/power'
import type { GameAction, GameState, Prompt } from '../game/types'
import { useCardDialog } from '../hooks/useCardDialog'
import { localizeCard } from '../i18n/cardTranslations'
import type { Locale } from '../i18n/LocaleProvider'
import { useLocale } from '../i18n/LocaleProvider'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'

const ROLL_DELAY = 900
const RESOLVE_DELAY = 1300
const BOSS_STEP_DELAY = 1300

type Busy = 'rolling' | 'resolving' | 'boss' | null

function SimCard({
  id,
  locale,
  onInspect,
  small,
  highlight,
}: {
  id: string
  locale: Locale
  onInspect: (element: HTMLElement) => void
  small?: boolean
  highlight?: boolean
}) {
  const entry = card(id)
  const localized = localizeCard(entry, locale)
  const art = getCardIllustration(entry)
  const power = entry.value
  return (
    <button
      className={`sim-card type-${slugify(entry.type)}${small ? ' is-small' : ''}${highlight ? ' is-highlight' : ''}`}
      onClick={(event) => onInspect(event.currentTarget)}
      title={localized.name}
      type="button"
    >
      <span aria-hidden="true" className="sim-card-art">
        {art ? <img alt="" loading="lazy" src={art.src} /> : <span>✦</span>}
      </span>
      <span className="sim-card-name">{localized.name}</span>
      {power ? <span className="sim-card-power">{power}</span> : null}
    </button>
  )
}

function heroCard(type: 'Classe' | 'Race', name: string) {
  return CARDS.find((entry) => entry.type === type && entry.name === name)
}

export function SoloSimulator() {
  const { locale } = useLocale()
  const copy = soloCopy[locale]
  const sim = copy.sim
  const { openCard } = useCardDialog()

  const [game, setGame] = useState<GameState | null>(null)
  const gameRef = useRef<GameState | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const timer = useRef<number | undefined>(undefined)
  const [klass, setKlass] = useState<ClassName>('Guerrier')
  const [race, setRace] = useState<RaceName>('Humain')
  const [bossPicker, setBossPicker] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const heroName = (type: 'Classe' | 'Race', name: string) => {
    const entry = heroCard(type, name)
    return entry ? localizeCard(entry, locale).name : name
  }

  const send = (action: GameAction) => {
    if (!gameRef.current) return
    gameRef.current = reduce(gameRef.current, action)
    setGame(gameRef.current)
  }

  const start = () => {
    window.clearTimeout(timer.current)
    setBusy(null)
    setBossPicker(false)
    gameRef.current = newGame(klass, race)
    setGame(gameRef.current)
  }

  const reset = () => {
    window.clearTimeout(timer.current)
    setBusy(null)
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
    timer.current = window.setTimeout(tick, 500)
  }

  const inspect = (id: string, element: HTMLElement) => openCard(card(id), undefined, element)

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

  const logLines = useMemo(() => (game ? game.log.slice(-60).reverse() : []), [game])

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
  const locked = busy !== null || Boolean(prompt)
  const ended = game.phase === 'won' || game.phase === 'lost'
  const main = game.phase === 'main' && !combat
  const status = activeStatus(game)
  const limit = handLimit(game)
  const bossUnlocked = game.level >= 10

  return (
    <div className="sim">
      <div className="sim-status">
        <Stat label={sim.level} value={`${game.level}/10`} />
        <Stat label={sim.turn} value={game.turn} />
        <Stat label={sim.die} value={`D${game.dieSides}`} />
        <Stat label={sim.hand} value={`${game.hand.length}/${limit}`} />
        <Stat label={sim.lootDeck} value={game.lootDeck.length} />
        <Stat label={sim.monsterDeck} value={game.monsterDeck.length} />
        {bossUnlocked ? (
          <Stat label={sim.pressure} title={fill(sim.pressureHint, { n: game.bossPressure })} value={`+${game.bossPressure}`} danger />
        ) : null}
        <button className="sim-link" onClick={reset} type="button">
          {sim.restart}
        </button>
      </div>

      <div className="sim-hero-line">
        {heroName('Race', game.race)} · {heroName('Classe', game.klass)}
        {game.mimic ? ` → ${heroName('Classe', game.mimic)}` : ''}
      </div>

      {ended ? (
        <div className={`sim-end ${game.phase}`}>
          <h3>{game.phase === 'won' ? sim.victoryTitle : sim.defeatTitle}</h3>
          <p>{game.phase === 'won' ? sim.victoryText : sim.defeatText}</p>
          <p>
            {fill(sim.stats, {
              m: game.stats.monsters,
              d: game.stats.defeats,
              f: game.stats.flees,
              t: game.turn,
            })}
          </p>
          <button className="button button-primary" onClick={reset} type="button">
            {sim.restart}
          </button>
        </div>
      ) : null}

      {combat && !ended ? (
        <section className="sim-panel sim-combat">
          <h3>{sim.combat}</h3>
          <div className="sim-versus">
            <div className="sim-side">
              <h4>{sim.you}</h4>
              {power ? (
                <PowerTable
                  rows={[
                    [sim.levelPart, power.player.level],
                    [sim.equipPart, power.player.equipment],
                    [sim.bonusPart, power.player.bonus],
                    [sim.diePart, power.player.die ?? '—'],
                  ]}
                  total={power.player.total}
                  totalLabel={sim.totalPart}
                />
              ) : null}
            </div>
            <div className="sim-side">
              <h4>{sim.opponent}</h4>
              <div className="sim-cards">
                {combat.kind === 'boss' && combat.bossId ? (
                  <SimCard id={combat.bossId} locale={locale} onInspect={(el) => inspect(combat.bossId as string, el)} />
                ) : null}
                {combat.monsters.map((id) => (
                  <SimCard id={id} key={id} locale={locale} onInspect={(el) => inspect(id, el)} />
                ))}
              </div>
              {combat.kind === 'boss' ? (
                <>
                  <p className="sim-note">
                    {sim.boosts} :
                  </p>
                  <div className="sim-cards">
                    {combat.bossEquip.map((id) => (
                      <SimCard small id={id} key={id} locale={locale} onInspect={(el) => inspect(id, el)} />
                    ))}
                  </div>
                  <p className="sim-note">
                    {sim.bossHandCount} : {combat.bossHand.length} {sim.cards}
                  </p>
                </>
              ) : null}
              {power ? (
                <PowerTable
                  rows={[
                    [combat.kind === 'boss' ? sim.boosts : sim.equipPart, power.opponent.equipment],
                    [sim.bonusPart, power.opponent.bonus],
                    [sim.diePart, power.opponent.die ?? '—'],
                  ]}
                  total={power.opponent.total}
                  totalLabel={sim.totalPart}
                />
              ) : null}
            </div>
          </div>

          {busy ? (
            <p aria-live="polite" className="sim-busy">
              {busy === 'rolling' ? sim.rolling : sim.resolving}
            </p>
          ) : null}

          <div className="sim-actions">
            {combat.playerDie === null ? (
              <button
                className="button button-primary"
                disabled={locked}
                onClick={() => delayed('rolling', ROLL_DELAY, { t: 'roll' })}
                type="button"
              >
                {sim.roll}
              </button>
            ) : null}
            <button
              className="button button-primary"
              disabled={locked}
              onClick={() => {
                if (combat.kind === 'boss') runBossSequence()
                else delayed('resolving', RESOLVE_DELAY, { t: 'resolve' })
              }}
              type="button"
            >
              {combat.playerDie === null ? sim.resolveNoDie : sim.resolve}
            </button>
            {!fleeBlocked(game) ? (
              <button className="button" disabled={locked} onClick={() => send({ t: 'flee' })} type="button">
                {sim.flee}
              </button>
            ) : null}
            {status.available ? (
              <button className="button" disabled={locked} onClick={() => send({ t: 'useActive' })} type="button">
                {sim.active} · {heroName('Classe', status.klass)}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {main && !ended ? (
        <section className="sim-panel">
          <h3>{sim.adventure}</h3>
          <div className="sim-actions">
            <button className="button button-primary" disabled={locked} onClick={() => send({ t: 'fightMonster' })} type="button">
              {sim.fight}
            </button>
            <button className="button button-primary" disabled={locked} onClick={() => send({ t: 'drawLoot' })} type="button">
              {game.race === 'Nain' ? sim.drawLootNain : sim.drawLoot}
            </button>
            <button
              className="button"
              disabled={locked || !bossUnlocked}
              onClick={() => setBossPicker((open) => !open)}
              type="button"
            >
              {bossUnlocked ? sim.boss : sim.bossLocked}
            </button>
          </div>
          {bossUnlocked && bossPicker ? (
            <>
              <h4>{sim.chooseBoss}</h4>
              <div className="sim-cards">
                {BOSS_IDS.map((id) => (
                  <div className="sim-pick" key={id}>
                    <SimCard id={id} locale={locale} onInspect={(el) => inspect(id, el)} />
                    <button
                      className="button button-primary"
                      disabled={locked}
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
            </>
          ) : null}
          {!bossUnlocked ? <p className="sim-note">{sim.bossWaits}</p> : null}
        </section>
      ) : null}

      <section className="sim-panel">
        <h3>{sim.equipment}</h3>
        <div className="sim-equipment">
          {ARMOR_SLOTS.map((slot) => {
            const id = game.equipment.armors[slot]
            return (
              <Slot key={slot} label={slot}>
                {id ? (
                  <EquippedCard
                    id={id}
                    locale={locale}
                    locked={locked || !main}
                    onInspect={(el) => inspect(id, el)}
                    onRemove={() => send({ t: 'unequip', id })}
                    removeLabel={sim.unequipBtn}
                  />
                ) : (
                  <span className="sim-empty">{sim.empty}</span>
                )}
              </Slot>
            )
          })}
          {[0, 1].map((index) => {
            const id = game.equipment.hands[index]
            const twoHanded = game.equipment.hands.length === 1 && card(game.equipment.hands[0]).subtype === 'Deux mains'
            return (
              <Slot key={`hand-${index}`} label={`${sim.weapons} ${index + 1}`}>
                {id ? (
                  <EquippedCard
                    id={id}
                    locale={locale}
                    locked={locked || !main}
                    onInspect={(el) => inspect(id, el)}
                    onRemove={() => send({ t: 'unequip', id })}
                    removeLabel={sim.unequipBtn}
                  />
                ) : (
                  <span className="sim-empty">{twoHanded && index === 1 ? '↑' : sim.empty}</span>
                )}
              </Slot>
            )
          })}
          <Slot label={sim.artifact}>
            {game.equipment.artifact ? (
              <EquippedCard
                id={game.equipment.artifact}
                locale={locale}
                locked={locked || !main}
                onInspect={(el) => inspect(game.equipment.artifact as string, el)}
                onRemove={() => send({ t: 'unequip', id: game.equipment.artifact as string })}
                removeLabel={sim.unequipBtn}
              />
            ) : (
              <span className="sim-empty">{sim.empty}</span>
            )}
          </Slot>
        </div>
      </section>

      <section className="sim-panel">
        <h3>
          {sim.hand} ({game.hand.length}/{limit})
        </h3>
        <p className="sim-note">{sim.handHint}</p>
        <div className="sim-cards">
          {game.hand.map((id, index) => {
            const entry = card(id)
            const equipable = canEquip(game, id)
            const playable = canPlayAction(game, id)
            return (
              <div className="sim-pick" key={`${id}-${index}`}>
                <SimCard id={id} locale={locale} onInspect={(el) => inspect(id, el)} />
                {equipable && !locked ? (
                  <button className="button" onClick={() => send({ t: 'equip', id })} type="button">
                    {sim.equipBtn}
                  </button>
                ) : null}
                {entry.type === 'Action' && playable && !locked ? (
                  <button className="button button-primary" onClick={() => send({ t: 'playAction', id })} type="button">
                    {sim.play}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="sim-panel">
        <h3>{sim.log}</h3>
        <ol className="sim-log">
          {logLines.map((entry, index) => (
            <li className={index === 0 ? 'is-latest' : undefined} key={game.log.length - index}>
              {formatLog(entry)}
            </li>
          ))}
        </ol>
      </section>

      {prompt ? (
        <div className="sim-modal-backdrop">
          <div aria-modal="true" className="sim-modal" role="dialog">
            <p className="sim-modal-title">
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
                const cardId = option.cardId ?? (option.id.startsWith('OSS-CARD-') ? option.id : undefined)
                if (cardId) {
                  return (
                    <div className="sim-pick" key={`${option.id}-${index}`}>
                      <SimCard id={cardId} locale={locale} onInspect={(el) => inspect(cardId, el)} />
                      <button
                        className="button button-primary"
                        onClick={() => send({ t: 'answer', option: option.id })}
                        type="button"
                      >
                        {sim.choose}
                      </button>
                    </div>
                  )
                }
                const label =
                  copy.options[option.id] ??
                  ((CLASS_NAMES as readonly string[]).includes(option.id) ? heroName('Classe', option.id) : option.id)
                return (
                  <button
                    className="button"
                    key={`${option.id}-${index}`}
                    onClick={() => send({ t: 'answer', option: option.id })}
                    type="button"
                  >
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

function Stat({
  label,
  value,
  danger,
  title,
}: {
  label: string
  value: string | number
  danger?: boolean
  title?: string
}) {
  return (
    <div className={`sim-stat${danger ? ' is-danger' : ''}`} title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Slot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sim-slot">
      <span className="sim-slot-label">{label}</span>
      {children}
    </div>
  )
}

function EquippedCard({
  id,
  locale,
  locked,
  onInspect,
  onRemove,
  removeLabel,
}: {
  id: string
  locale: Locale
  locked: boolean
  onInspect: (element: HTMLElement) => void
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <div className="sim-pick">
      <SimCard small id={id} locale={locale} onInspect={onInspect} />
      {!locked ? (
        <button className="button" onClick={onRemove} type="button">
          {removeLabel}
        </button>
      ) : null}
    </div>
  )
}

function PowerTable({
  rows,
  total,
  totalLabel,
}: {
  rows: [string, string | number][]
  total: number
  totalLabel: string
}) {
  return (
    <table className="sim-power">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
        <tr className="is-total">
          <th>{totalLabel}</th>
          <td>{total}</td>
        </tr>
      </tbody>
    </table>
  )
}
