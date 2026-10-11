import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CardDialogContext } from '../hooks/useCardDialog'
import type { CardDialogContextValue } from '../hooks/useCardDialog'
import type { Card } from '../types/card'
import { CardDetailsDialog } from './CardDetailsDialog'

type DialogState = { card: Card; siblings: readonly Card[]; origin: DOMRect | null; actions: ReactNode }

export function CardDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)

  const value = useMemo<CardDialogContextValue>(
    () => ({
      openCard: (card, siblings = [], origin, actions) =>
        setState({ card, siblings, origin: origin?.getBoundingClientRect() ?? null, actions }),
      closeCard: () => setState(null),
    }),
    [],
  )

  const index = state ? state.siblings.findIndex((entry) => entry.id === state.card.id) : -1
  const previous = state && index > 0 ? state.siblings[index - 1] : null
  const next = state && index >= 0 ? (state.siblings[index + 1] ?? null) : null

  function goTo(card: Card) {
    setState((current) => (current ? { ...current, card } : current))
  }

  return (
    <CardDialogContext.Provider value={value}>
      {children}
      <CardDetailsDialog
        actions={state?.actions}
        card={state?.card ?? null}
        onClose={value.closeCard}
        onNext={next ? () => goTo(next) : undefined}
        onPrevious={previous ? () => goTo(previous) : undefined}
        origin={state?.origin ?? null}
      />
    </CardDialogContext.Provider>
  )
}
