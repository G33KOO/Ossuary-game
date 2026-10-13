import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { messages } from './messages'
import { LocaleContext } from './localeContext'
import type { Locale, LocaleContextValue } from './localeContext'
export type { Locale } from './localeContext'
const localeStorageKey = 'ossuaire-locale'

function getInitialLocale(): Locale {
  try {
    const storedLocale = window.localStorage.getItem(localeStorageKey)
    if (storedLocale === 'fr' || storedLocale === 'en') {
      return storedLocale
    }
  } catch (error) {
    console.warn('Impossible de lire la langue enregistrée.', error)
  }

  return 'fr'
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = messages[locale]['document.title']
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', messages[locale]['document.description'])

    try {
      window.localStorage.setItem(localeStorageKey, locale)
    } catch (error) {
      console.warn('Impossible d’enregistrer la langue choisie.', error)
    }
  }, [locale])

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      toggleLocale: () => setLocale((currentLocale) => (currentLocale === 'fr' ? 'en' : 'fr')),
      t: (key) => messages[locale][key],
    }),
    [locale],
  )

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
}
