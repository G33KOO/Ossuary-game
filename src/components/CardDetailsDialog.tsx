import { useEffect, useRef } from 'react'
import type { Card } from '../types/card'
import { getCardIllustration } from '../utils/cardIllustration'
import { slugify } from '../utils/slugify'
import { useLocale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'

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
}

export function CardDetailsDialog({ card, onClose, onPrevious, onNext, origin }: CardDetailsDialogProps) {
  const { locale, t } = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const illustration = card ? getCardIllustration(card.name) : undefined
  const localizedCard = card ? localizeCard(card, locale) : null
  const isOpen = card !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('.dialog-close')?.focus({ preventScroll: true })
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
      aria-labelledby="card-dialog-title"
      className={`card-dialog type-${slugify(card.type)}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <button
        aria-label={t('card.close')}
        className="dialog-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <div className="dialog-layout">
        <div className="dialog-visual">
          {illustration ? (
            <img alt="" className="dialog-art" src={illustration.src} />
          ) : (
            <span aria-hidden="true" className="dialog-symbol">{symbolFor(card.type)}</span>
          )}
        </div>
        <div className="dialog-body">
          <p className="eyebrow">{localizedCard.type} · {card.id}</p>
          <h2 id="card-dialog-title">{localizedCard.name}</h2>
          <p className="dialog-subtitle">
            {[localizedCard.subtype, localizedCard.deck].filter(Boolean).join(' · ')}
          </p>
          {localizedCard.text ? (
            <p className="dialog-rule">{localizedCard.text}</p>
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
          <div className="dialog-nav">
            <button disabled={!onPrevious} onClick={onPrevious} type="button">
              ← {t('card.previous')}
            </button>
            <button disabled={!onNext} onClick={onNext} type="button">
              {t('card.next')} →
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
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

function symbolFor(type: string) {
  if (type === 'Arme') return '⚔'
  if (type === 'Armure') return '⬡'
  if (type === 'Action' || type === 'Artefact de classe') return '✧'
  if (type === 'Monstre') return '☠'
  if (type === 'Boss') return '♜'
  if (type === 'Serment') return '✳'
  if (type === 'Classe' || type === 'Race') return '◈'
  return '✦'
}
