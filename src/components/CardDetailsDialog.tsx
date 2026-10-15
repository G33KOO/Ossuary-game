import { symbolFor } from '../utils/cardSymbols'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import type { Card } from '../types/card'
import { getCardIllustration, hasFemaleVariant } from '../utils/cardIllustration'
import type { CardGender } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import { useLocale } from '../hooks/useLocale'
import { localizeCard } from '../i18n/cardTranslations'
import { getCardClass, getClassIcon } from '../utils/cardClass'
import { ModalHeader } from './ModalHeader'
import { CARDS } from '../game/data'
import { soloCopy } from '../content/solo'
import './card-details-mobile.css'
import { CardClassBadge } from './CardClassBadge'
import { CardBack } from './CardBack'
import { cardBackArt, cardBackKind } from '../utils/cardBack'

function zoomFromOrigin(dialog: HTMLDialogElement, origin: DOMRect | null) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const target = dialog.getBoundingClientRect()
  const from = origin
    ? {
        x: origin.left + origin.width / 2 - (target.left + target.width / 2),
        y: origin.top + origin.height / 2 - (target.top + target.height / 2),
        scale: Math.max(0.12, Math.min(origin.width / target.width, origin.height / target.height)),
      }
    : { x: 0, y: 40, scale: 0.85 }

  dialog.animate(
    [
      {
        opacity: 0.2,
        transform: `translate(${from.x}px, ${from.y}px) scale(${from.scale})`,
        filter: 'brightness(1.6) blur(2px)',
      },
      { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'brightness(1) blur(0)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.19, 1, 0.22, 1)' },
  )
}

type CardDetailsDialogProps = {
  card: Card | null
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  origin?: DOMRect | null
  actions?: ReactNode
}

export function CardDetailsDialog({ card, onClose, onPrevious, onNext, origin, actions }: CardDetailsDialogProps) {
  const { locale, t } = useLocale()
  const { pathname } = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [genderChoice, setGenderChoice] = useState<{ cardId: string; gender: CardGender }>({
    cardId: '',
    gender: 'male',
  })
  const gender = card && genderChoice.cardId === card.id ? genderChoice.gender : 'male'
  const illustration = card ? getCardIllustration(card, gender) : undefined
  const [backCardId, setBackCardId] = useState<string | null>(null)
  const backKind = card ? cardBackKind(card) : undefined
  const showingBack = Boolean(backKind && backCardId === card?.id)
  const visualSrc = showingBack && backKind ? cardBackArt[backKind] : illustration?.src
  const close = () => { setBackCardId(null); onClose() }
  const canSwitchGender = card ? hasFemaleVariant(card) : false
  const localizedCard = card ? localizeCard(card, locale) : null
  const isOpen = card !== null
  const pathClass = card?.name.startsWith('Voie du ') ? getCardClass(card) : undefined
  const pathClassCard = pathClass ? CARDS.find((entry) => entry.type === 'Classe' && entry.name === pathClass) : undefined
  const localizedPathClass = pathClassCard ? localizeCard(pathClassCard, locale) : undefined
  const solo = soloCopy[locale]
  const pathEffect = localizedPathClass ? pathname.startsWith('/solo') ? pathClass === 'Voleur' ? solo.sim.soloRogueEffect : solo.rules.flatMap((section) => section.items).find((item) => item.startsWith(`${localizedPathClass.name} —`)) ?? localizedPathClass.text : localizedPathClass.text : undefined

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('.modal-close')?.focus({ preventScroll: true })
      zoomFromOrigin(dialog, origin ?? null)
    }
  }, [isOpen, origin])

  useEffect(() => {
    if (!isOpen) return

    function navigateWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') onPrevious?.()
      if (event.key === 'ArrowRight') onNext?.()
    }

    document.addEventListener('keydown', navigateWithKeyboard)
    return () => document.removeEventListener('keydown', navigateWithKeyboard)
  }, [isOpen, onNext, onPrevious])

  if (!card || !localizedCard) return null

  return (
    <dialog
      aria-labelledby="card-modal-heading"
      className={`card-dialog type-${slugify(card.type)}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      onClose={close}
      ref={dialogRef}
    >
      <ModalHeader id="card-modal-heading" title={t('card.detailsTitle')} onClose={close} closeLabel={t('card.close')} />
      <div className="dialog-layout">
        <div className="dialog-visual">
          {visualSrc ? (
            <TiltableCard key={`${card.id}-${gender}-${showingBack}`} src={visualSrc} label={t('card.tilt')}>
              {!showingBack && <CardFaceBadges card={card} powerLabel={t('card.printedValue')} />}
            </TiltableCard>
          ) : (
            showingBack && backKind ? <div className="dialog-back-preview"><CardBack kind={backKind} size="lg" /></div> : <div className="dialog-static-card"><span aria-hidden="true" className="dialog-symbol">{symbolFor(card.type)}</span><CardFaceBadges card={card} powerLabel={t('card.printedValue')} /></div>
          )}
          {backKind ? <div className="variant-switch card-face-switch" role="group" aria-label={t('card.faces')}>
            <button type="button" aria-pressed={!showingBack} onClick={() => setBackCardId(null)}>{t('card.front')}</button>
            <button type="button" aria-pressed={showingBack} onClick={() => setBackCardId(card.id)}>{t('card.back')}</button>
          </div> : null}
          {canSwitchGender && !showingBack && (
            <div aria-label={t('card.variants')} className="variant-switch" role="group">
              {(['male', 'female'] as const).map((option) => (
                <button
                  aria-pressed={gender === option}
                  key={option}
                  onClick={() => setGenderChoice({ cardId: card.id, gender: option })}
                  type="button"
                >
                  {t(option === 'male' ? 'card.variantMale' : 'card.variantFemale')}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="dialog-body">
          <p className="eyebrow">{localizedCard.type} · {card.id}</p>
          <h2 id="card-dialog-title">{localizedCard.name}</h2>
          <p className="dialog-subtitle">
            {[localizedCard.subtype, localizedCard.deck].filter(Boolean).join(' · ')}
          </p>
          {localizedCard.text ? (
            <p className="dialog-rule">{pathClass && localizedPathClass && pathEffect && localizedCard.text.includes(localizedPathClass.name) ? <>{localizedCard.text.slice(0, localizedCard.text.indexOf(localizedPathClass.name))}<ClassAbilityPreview key={`${card.id}-${locale}`} name={localizedPathClass.name} icon={getClassIcon(pathClass)} effect={pathEffect} title={t('card.pathAbility')} duration={t('card.pathDuration')} />{localizedCard.text.slice(localizedCard.text.indexOf(localizedPathClass.name) + localizedPathClass.name.length)}</> : localizedCard.text}</p>
          ) : (
            <p className="dialog-rule">{t('card.ruleMissing')}</p>
          )}
          {localizedCard.requirement && (
            <Detail label={t('card.requirement')} value={localizedCard.requirement} />
          )}
          {card.levelGain && <Detail label={t('card.levelGain')} value={card.levelGain} />}
          {localizedCard.opponentBonus && (
            <Detail label={t('card.opponentBonus')} value={localizedCard.opponentBonus} />
          )}
          {card.loot && <Detail label={t('card.loot')} value={card.loot} />}
          {card.value && (
            <span className="dialog-value">{t('card.printedValue')} · {card.value}</span>
          )}
          {actions ? (
            <div className="dialog-actions" onClick={close}>
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}

function ClassAbilityPreview({ name, icon, effect, title, duration }: { name: string; icon: string; effect: string; title: string; duration: string }) {
  const id = useId()
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const show = (element: HTMLElement) => {
    const bounds = element.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth * .85)
    setPosition({ left: Math.max(16, Math.min(bounds.left, window.innerWidth - width - 16)), top: bounds.bottom + 240 < window.innerHeight ? bounds.bottom + 10 : Math.max(16, bounds.top - 230) })
  }
  useEffect(() => {
    if (!position) return
    const hide = () => setPosition(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide) }
  }, [position])
  return <span className="dialog-class-preview">
    <button type="button" className="dialog-class-link" aria-describedby={position ? id : undefined} onPointerEnter={(event) => { if (event.pointerType === 'mouse') show(event.currentTarget) }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setPosition(null) }} onFocus={(event) => show(event.currentTarget)} onBlur={() => setPosition(null)} onClick={(event) => show(event.currentTarget)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPosition(null) } }}>{name}</button>
    {position ? <span id={id} role="tooltip" className="dialog-class-ability-tooltip" style={position}><span className="dialog-class-ability-heading"><img alt="" src={icon} /><strong>{name} · {title}</strong></span><span className="dialog-class-ability-effect">{effect}</span><span className="dialog-class-ability-duration">{duration}</span></span> : null}
  </span>
}

function CardFaceBadges({ card, powerLabel }: { card: Card; powerLabel: string }) {
  return <>
    <CardClassBadge card={card} className="dialog-class-badge" />
    {card.value ? <span className="dialog-power-badge" title={`${powerLabel} : ${card.value}`} aria-label={`${powerLabel} : ${card.value}`}>{card.value}</span> : null}
  </>
}

function TiltableCard({ src, label, children }: { src: string; label: string; children: ReactNode }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, dragging: false })
  const pointer = useRef<{ id: number; x: number; y: number; width: number; height: number; startX: number; startY: number } | null>(null)
  const clamp = (value: number) => Math.max(-12, Math.min(12, value))
  const reset = () => {
    pointer.current = null
    setTilt({ x: 0, y: 0, dragging: false })
  }
  return <div className="dialog-tilt-stage">
    <div className={`dialog-tilt-card${tilt.dragging ? ' is-dragging' : ''}${tilt.x || tilt.y ? ' is-tilted' : ''}`} role="button" tabIndex={0} aria-label={label}
      style={{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg`, '--shine-x': `${50 + tilt.y * 2.5}%`, '--shine-y': `${50 - tilt.x * 2.5}%` } as CSSProperties}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return
        const bounds = event.currentTarget.getBoundingClientRect()
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, startX: tilt.x, startY: tilt.y }
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.focus({ preventScroll: true })
        setTilt((current) => ({ ...current, dragging: true }))
      }}
      onPointerMove={(event) => {
        const start = pointer.current
        if (!start || start.id !== event.pointerId) return
        setTilt({ x: clamp(start.startX - (event.clientY - start.y) / Math.max(1, start.height) * 32), y: clamp(start.startY + (event.clientX - start.x) / Math.max(1, start.width) * 32), dragging: true })
      }}
      onPointerUp={(event) => { if (pointer.current?.id === event.pointerId) { event.currentTarget.releasePointerCapture(event.pointerId); reset() } }}
      onPointerCancel={reset} onLostPointerCapture={reset} onBlur={reset}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          if (pointer.current || tilt.x || tilt.y) { event.preventDefault(); event.stopPropagation(); reset() }
          return
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(event.key)) {
          event.preventDefault()
          event.stopPropagation()
          if (['Enter', ' ', 'Escape'].includes(event.key)) reset()
          else setTilt((current) => ({ x: clamp(current.x + (event.key === 'ArrowUp' ? 3 : event.key === 'ArrowDown' ? -3 : 0)), y: clamp(current.y + (event.key === 'ArrowRight' ? 3 : event.key === 'ArrowLeft' ? -3 : 0)), dragging: false }))
        }
      }}>
      <img alt="" className="dialog-art" src={src} draggable={false} />
      {children}
      <span aria-hidden="true" className="dialog-card-reflection" />
    </div>
  </div>
}

type DetailProps = {
  label: string
  value: string
}

function Detail({ label, value }: DetailProps) {
  return (
    <p className="dialog-detail">
      <strong>{label}</strong>
      {value}
    </p>
  )
}
