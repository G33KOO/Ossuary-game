import { useLayoutEffect, useState } from 'react'
import { useBoardFocus } from '../hooks/useBoardFocus'
import type { Locale } from '../i18n/LocaleProvider'
import type { Prompt } from '../game/types'
import { GameCard } from './game-ui'
import { card } from '../game/data'
import { localizeCard } from '../i18n/cardTranslations'

const REVEALED_CHOICES = new Set(['oath', 'fournaise', 'hunter-pick', 'hunter-boss-pick', 'thief-pick'])

/** Resolve game decisions on the table while keeping the hero and hand visible. */
export function BoardChoice({ prompt, title, instructions, locale, sim, label, inspect, answer }: {
  prompt: Prompt; title: string; instructions: string; locale: Locale; sim: Record<string, string>
  label: (id: string) => string; inspect: (id: string, element: HTMLElement) => void
  answer: (id: string | null) => void
}) {
  const signature = `${prompt.purpose}:${prompt.options.map((option) => option.id).join(',')}`
  const targetArmor = prompt.purpose === 'envers' && typeof prompt.ctx.armor === 'string' ? prompt.ctx.armor : null
  const root = useBoardFocus(signature)
  const animated = REVEALED_CHOICES.has(prompt.purpose)
  const [dealt, setDealt] = useState<string | null>(null)
  const ready = !animated || dealt === signature
  useLayoutEffect(() => {
    if (!animated) return
    const source = (prompt.purpose === 'oath' ? root.current : document.querySelector(prompt.purpose === 'thief-pick' ? '.gb-side-right .gb-pile-stack' : prompt.purpose === 'hunter-boss-pick' ? '.gb-side-boss .gb-pile-stack' : '.gb-side-left .gb-pile-stack'))?.getBoundingClientRect() ?? root.current?.getBoundingClientRect()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animations: Animation[] = []
    if (source && !reduced) root.current?.querySelectorAll<HTMLElement>('.gb-choice-card').forEach((element, index) => {
      const target = element.getBoundingClientRect()
      animations.push(element.animate([
        { opacity: 0, transform: `translate(${source.left + source.width / 2 - target.left - target.width / 2}px, ${source.top - target.top}px) scale(.6) rotate(-8deg)` },
        { opacity: 1, transform: 'translate(0, 0) scale(1) rotate(0)' },
      ], { duration: 600, delay: index * 100, fill: 'backwards', easing: 'cubic-bezier(.2,.7,.2,1)' }))
    })
    const timer = window.setTimeout(() => setDealt(signature), reduced ? 0 : 600 + Math.max(0, prompt.options.length - 1) * 100)
    return () => { window.clearTimeout(timer); animations.forEach((animation) => animation.cancel()) }
  }, [animated, signature, prompt.purpose, prompt.options.length, root])
  const choices = <div className="gb-board-choice-options">{prompt.options.map((option, index) => {
      const cardId = option.cardId ?? (option.id.startsWith('OSS-CARD-') ? option.id : undefined)
      return cardId ? <div className="gb-choice-card" key={`${option.id}-${index}`}>
        <GameCard id={cardId} locale={locale} size="md" onInspect={(element) => inspect(cardId, element)} />
        <button className="button button-primary" type="button" disabled={!ready} onClick={() => answer(option.id)}>{targetArmor ? sim.discardCard : prompt.purpose === 'weapon-loot' ? sim.harvest : sim.choose}</button>
      </div> : <button className={`button${option.id === 'flee' ? ' gb-flee-button' : ''}`} key={option.id} disabled={!ready} type="button" onClick={() => answer(option.id)}>{targetArmor && option.id === 'decline' ? sim.enversYield : label(option.id)}</button>
    })}</div>
  return <section ref={root} className="gb-board-choice" aria-labelledby="board-choice-title" aria-busy={!ready}>
    <h3 id="board-choice-title">{title}</h3>
    <p role="status">{instructions}</p>
    {targetArmor ? <div className="gb-envers-layout"><aside className="gb-envers-target"><strong>{sim.enversTarget}</strong><GameCard className="gb-envers-threat" id={targetArmor} locale={locale} size="md" equipmentPower={Number(prompt.ctx.armorPower ?? card(targetArmor).value)} onInspect={element => inspect(targetArmor, element)} /><span>{localizeCard(card(targetArmor), locale).name}</span><span>{sim.powerPart} : {prompt.ctx.armorPower ?? card(targetArmor).value}</span></aside><div className="gb-envers-response"><h4>{sim.enversDiscardChoice}</h4>{choices}</div></div> : choices}
    {prompt.optional ? <button className="button gb-board-choice-skip" type="button" disabled={!ready} onClick={() => answer(null)}>{sim.skip}</button> : null}
  </section>
}
