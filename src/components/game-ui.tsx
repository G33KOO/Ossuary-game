import { CARD_SYMBOLS as TYPE_ICON } from '../utils/cardSymbols'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { card } from '../game/data'
import type { ClassName } from '../game/data'
import { isMasteredWeapon } from '../game/power'
import type { Locale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'
import { getCardIllustration } from '../utils/cardIllustration'
import { CardClassBadge } from './CardClassBadge'
import { slugify } from '../utils/slugify'
import { ModalHeader } from './ModalHeader'

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

export function GameCard({
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
        <CardClassBadge card={entry} className="gb-class-icon" />
        {entry.value ? <span className={`gb-orb${boosted ? ' is-boosted' : ''}`} title={powerLabel || undefined} key={`power-${equipmentPower ?? entry.value}`}>{equipmentPower ?? entry.value}</span> : null}
        <span className="gb-name">{localized.name}</span>
      </button>
      {actions ? <div className="gb-card-actions">{actions}</div> : null}
      {mobileActions ? <div className="gb-mobile-card-actions">{mobileActions}</div> : null}
    </div>
  )
}

export function CardBack({ kind, size = 'md', actionLabel }: { kind: 'loot' | 'monster' | 'boss'; size?: 'sm' | 'md' | 'lg'; actionLabel?: string }) {
  return (
    <span aria-hidden="true" className={`gb-back kind-${kind} size-${size}`}>
      <span>{kind === 'loot' ? '✦' : kind === 'monster' ? '☠' : '♜'}</span>
      {actionLabel ? <span className="gb-pile-action"><span className="gb-pile-action-label">{actionLabel}</span></span> : null}
    </span>
  )
}

export function Pile({
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

export function Discard({
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

export function DiscardGallery({ ids, title, locale, closeLabel, onClose, onInspect }: {
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

export function Die({ sides, value, rolling, label }: { sides: number; value: number | null; rolling: boolean; label: string }) {
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

export function Score({ label, total, parts, side }: { label: string; total: number; parts: string; side: 'you' | 'foe' }) {
  return (
    <div className={`gb-score ${side}`}>
      <span className="gb-score-label">{label}</span>
      <strong key={total} className="gb-power-change">{total}</strong>
      <span className="gb-score-parts">{parts}</span>
    </div>
  )
}
