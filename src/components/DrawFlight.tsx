import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../i18n/LocaleProvider'
import { CardBack, GameCard } from './game-ui'

/** Only the cards fly over the existing table; no backdrop or presentation screen. */
export function DrawFlight({ kind, cards, locale }: { kind: 'loot' | 'monster'; cards: string[]; locale: Locale }) {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const hand = cards.map((id) => document.querySelector<HTMLElement>(`.gb-hand [data-card-id="${id}"]`))
    if (kind === 'loot') hand.at(-1)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const source = document.querySelector(`.gb-side-${kind === 'loot' ? 'right' : 'left'} .gb-pile-stack`)?.getBoundingClientRect()
    const landing = document.querySelector('.gb-monster-landing')?.getBoundingClientRect()
    const arena = document.querySelector('.gb-arena')?.getBoundingClientRect()
    const animations: Animation[] = []
    root.current?.querySelectorAll<HTMLElement>('.gb-draw-flight').forEach((element, index) => {
      const destination = kind === 'loot' ? hand[index]?.getBoundingClientRect() : document.querySelector(`.gb-foe [data-card-id="${cards[index]}"]`)?.getBoundingClientRect() ?? landing ?? (arena ? { left: arena.left + arena.width / 2 - 50, top: arena.top + Math.max(0, (arena.height - 140) / 2), width: 100 } : undefined)
      if (!source || !destination) return
      const width = Math.min(destination.width, 150)
      const x = Math.max(4, Math.min(window.innerWidth - width - 4, destination.left))
      const y = Math.max(4, Math.min(window.innerHeight - width * 1.4 - 4, destination.top))
      element.style.setProperty('--flight-width', `${width}px`)
      element.style.left = `${x}px`
      element.style.top = `${y}px`
      const from = `translate(${source.left + source.width / 2 - x - width / 2}px, ${source.top - y}px) scale(${source.width / width}) rotateY(180deg)`
      animations.push(element.animate([
        { transform: from, opacity: 1, offset: 0 },
        { transform: from, opacity: 1, offset: .08 },
        { transform: `translate(${(source.left - x) * .35}px, ${(source.top - y) * .35}px) scale(1.08) rotateY(0deg)`, opacity: 1, offset: .48 },
        { transform: 'translate(0, 0) scale(1) rotateY(0deg)', opacity: 1, offset: 1 },
      ], { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 1800, delay: index * 250, easing: 'ease-in-out', fill: 'both' }))
    })
    return () => animations.forEach((animation) => animation.cancel())
  }, [kind, cards])
  return createPortal(<div ref={root} className="gb-draw-flights" aria-hidden="true">{cards.map((id, index) => <div className={`gb-draw-flight from-${kind}`} key={`${id}-${index}`}>
    <span className="gb-draw-flight-back"><CardBack kind={kind} size="lg" /></span>
    <GameCard decorative id={id} locale={locale} size="lg" onInspect={() => undefined} />
  </div>)}</div>, document.body)
}
