import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../i18n/LocaleProvider'
import { CardBack, GameCard } from './game-ui'

export type DrawOrigin = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

/** Only the cards fly over the existing table; no backdrop or presentation screen. */
export function DrawFlight({ kind, cards, locale, origin }: { kind: 'loot' | 'monster'; cards: string[]; locale: Locale; origin?: DrawOrigin }) {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const hand = cards.map((id) => document.querySelector<HTMLElement>(`.gb-hand [data-card-id="${id}"]`))
    if (kind === 'loot') hand.at(-1)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const monster = (id: string) => document.querySelector<HTMLElement>(`.gb-combat-context [data-card-id="${id}"], .gb-foe [data-card-id="${id}"], .gb-board-choice [data-card-id="${id}"]`)
    if (kind === 'monster') monster(cards[0])?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
    const source = origin ?? document.querySelector(`.gb-side-${kind === 'loot' ? 'right' : 'left'} .gb-pile-stack .gb-back:nth-child(3)`)?.getBoundingClientRect()
    const landing = document.querySelector('.gb-monster-landing')?.getBoundingClientRect()
    const arena = document.querySelector('.gb-arena')?.getBoundingClientRect()
    const animations: Animation[] = []
    root.current?.querySelectorAll<HTMLElement>('.gb-draw-flight').forEach((element, index) => {
      const destination = kind === 'loot' ? hand[index]?.getBoundingClientRect() : monster(cards[index])?.getBoundingClientRect() ?? landing ?? (arena ? { left: arena.left + arena.width / 2 - 50, top: arena.top + Math.max(0, (arena.height - 140) / 2), width: 100 } : undefined)
      if (!source || !destination) return
      const width = kind === 'monster' ? destination.width : Math.min(destination.width, 150)
      const x = kind === 'monster' ? destination.left : Math.max(4, Math.min(window.innerWidth - width - 4, destination.left))
      const y = kind === 'monster' ? destination.top : Math.max(4, Math.min(window.innerHeight - width * 1.4 - 4, destination.top))
      element.style.setProperty('--flight-width', `${width}px`)
      element.style.left = `${x}px`
      element.style.top = `${y}px`
      // Transform around the top left so the flying back starts on the actual
      // deck card, rather than jumping by half the change in card size.
      element.style.transformOrigin = 'top left'
      const from = `translate(${source.left - x}px, ${source.top - y}px) scale(${source.width / width})`
      const liftX = source.left - x
      const liftY = source.top - y
      const timing = { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 1800, delay: index * 250, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' as const }
      animations.push(element.animate([
        { transform: from, opacity: 1, offset: 0 },
        { transform: `translate(${liftX}px, ${liftY - 20}px) scale(${source.width / width})`, opacity: 1, offset: .16 },
        { transform: `translate(${liftX * .35}px, ${liftY * .35 - 24}px) scale(.95)`, opacity: 1, offset: .6 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 1 },
      ], timing))
      const rotator = element.querySelector('.gb-draw-flight-rotator')
      if (rotator) animations.push(rotator.animate([
        { transform: 'rotateY(180deg)', offset: 0 },
        { transform: 'rotateY(180deg)', offset: .16 },
        { transform: 'rotateY(0deg)', offset: .6 },
        { transform: 'rotateY(0deg)', offset: 1 },
      ], timing))
    })
    return () => animations.forEach((animation) => animation.cancel())
  }, [kind, cards, origin])
  return createPortal(<div ref={root} className="gb-draw-flights" aria-hidden="true">{cards.map((id, index) => <div className={`gb-draw-flight from-${kind}`} key={`${id}-${index}`}>
    <div className="gb-draw-flight-rotator">
    <span className="gb-draw-flight-back"><CardBack kind={kind} size="lg" /></span>
    <GameCard decorative id={id} locale={locale} size="lg" onInspect={() => undefined} />
    </div>
  </div>)}</div>, document.body)
}
