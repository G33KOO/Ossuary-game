import type { GameState } from '../game/types'
import type { Locale } from '../i18n/LocaleProvider'
import { localizeCard } from '../i18n/cardTranslations'
import { card } from '../game/data'
import { EffectPresentation } from './EffectPresentation'

/** Keep the announced action visible until the player explicitly responds. */
export function BossCounterResponse({ cardId, sequence, locale, sim, formatLog, inspect, onCounter, onPass }: {
  cardId: string; sequence: number; locale: Locale; sim: Record<string, string>
  formatLog: (entry: GameState['log'][number]) => string
  inspect: (id: string, element: HTMLElement) => void
  onCounter: () => void; onPass: () => void
}) {
  return <EffectPresentation
    stage={{ id: cardId, seq: sequence, lines: [{ code: 'bossPlays', params: { card: cardId } }] }}
    locale={locale} sim={sim} formatLog={formatLog} inspect={inspect} onNext={onPass}
    actions={<div className="gb-counter-response">
      <p>{localizeCard(card(cardId), locale).text}</p>
      <p role="status">{sim.counterWindow}</p>
      <div>
        <button className="button button-primary" type="button" onClick={onCounter}>{sim.counterUse}</button>
        <button className="button" type="button" onClick={onPass}>{sim.counterPass}</button>
      </div>
    </div>}
  />
}
