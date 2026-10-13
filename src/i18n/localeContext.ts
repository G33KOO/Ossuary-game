import { createContext } from 'react'
import type { MessageKey } from './messages'
export type Locale = 'fr' | 'en'
export type LocaleContextValue = { locale: Locale; toggleLocale: () => void; t: (key: MessageKey) => string }
export const LocaleContext = createContext<LocaleContextValue | null>(null)
