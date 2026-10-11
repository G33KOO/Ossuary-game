import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Card } from '../types/card'

export type CardDialogContextValue = {
  /**
   * Ouvre la modale sur place. `siblings` active la navigation précédente/suivante,
   * `origin` (élément cliqué) sert de point de départ à l'animation de zoom.
   */
  openCard: (card: Card, siblings?: readonly Card[], origin?: Element | null, actions?: ReactNode) => void
  closeCard: () => void
}

export const CardDialogContext = createContext<CardDialogContextValue | null>(null)

export function useCardDialog(): CardDialogContextValue {
  const context = useContext(CardDialogContext)
  if (!context) throw new Error('useCardDialog must be used within CardDialogProvider')
  return context
}
