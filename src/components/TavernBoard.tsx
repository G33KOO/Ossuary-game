import { useLayoutEffect, useRef, useState } from 'react'
import type { Locale } from '../i18n/LocaleProvider'
import type { Prompt } from '../game/types'
import { fill } from '../content/solo'
import { GameCard } from './game-ui'

export function TavernBoard({ prompt, locale, sim, instructions, canTrade, inspect, answer, dragging, trade }: {
  prompt: Prompt; locale: Locale; sim: Record<string, string>; instructions: string; canTrade: boolean
  inspect: (id: string, element: HTMLElement) => void
  answer: (option: string | null) => void
  dragging: boolean; trade: (offer: string) => void
}) {
  const root = useRef<HTMLElement>(null)
  const [readySignature, setReadySignature] = useState<string | null>(null)
  const choices = prompt.ctx.choices as string[]
  const signature = choices.join(',')
  const ready = readySignature === signature
  const exchanging = prompt.purpose === 'tavern-give'
  useLayoutEffect(() => {
    const source = document.querySelector('.gb-side-right .gb-pile-stack')?.getBoundingClientRect()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animations: Animation[] = []
    if (source && !reduced) root.current?.querySelectorAll<HTMLElement>('.gb-tavern-offer').forEach((element, index) => {
      const target = element.getBoundingClientRect()
      animations.push(element.animate([
        { transform: `translate(${source.left + source.width / 2 - target.left - target.width / 2}px, ${source.top - target.top}px) scale(.55) rotate(8deg)`, opacity: 0 },
        { transform: 'translate(0, 0) scale(1) rotate(0)', opacity: 1 },
      ], { duration: 650, delay: index * 120, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }))
    })
    const timer = window.setTimeout(() => setReadySignature(signature), reduced ? 0 : 650 + Math.max(0, choices.length - 1) * 120)
    return () => { window.clearTimeout(timer); animations.forEach((animation) => animation.cancel()) }
  }, [signature, choices.length])
  return <section ref={root} className={`gb-tavern-board${ready ? '' : ' is-dealing'}`} aria-labelledby="board-tavern-title" aria-busy={!ready}>
    <div className="gb-tavern-heading"><h3 id="board-tavern-title">{sim.tavernTitle}</h3><span>{fill(sim.tradesRemaining, { count: Number(prompt.ctx.remaining ?? 1) })}</span></div>
    <p role="status">{exchanging ? sim.tavernSelectHand : fill(instructions, { count: choices.length })}</p>
    <div className="gb-tavern-offers">{choices.map((id) => <div className={`gb-tavern-offer${prompt.ctx.taken === id ? ' is-selected' : ''}${dragging && ready ? ' is-drop-target' : ''}`} key={id} onDragOver={(event) => { if (dragging && ready && canTrade) event.preventDefault() }} onDrop={(event) => { if (dragging && ready && canTrade) { event.preventDefault(); trade(id) } }}>
      <GameCard id={id} locale={locale} size="md" onInspect={(element) => inspect(id, element)} />
      <button className="button button-primary" type="button" aria-pressed={prompt.ctx.taken === id} disabled={!ready || !canTrade || prompt.ctx.taken === id} onClick={() => { if (exchanging) answer('tavern-back'); answer(id) }}>{prompt.ctx.taken === id ? sim.tavernSelected : sim.choose}</button>
    </div>)}</div>
    <div className="gb-tavern-mobile-controls">
      {exchanging ? <button className="button" type="button" disabled={!ready} onClick={() => answer('tavern-back')}>{sim.tavernBack}</button> : null}
      <button className="button button-primary" type="button" disabled={!ready} onClick={() => { if (exchanging) answer('tavern-back'); answer(null) }}>{sim.noThanks}</button>
    </div>
  </section>
}
