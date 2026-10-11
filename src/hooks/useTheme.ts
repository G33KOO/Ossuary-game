import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const storageKey = 'ossuaire-theme'

function getInitialTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(storageKey)
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme
    }
  } catch (error) {
    console.warn('Impossible de lire le thème enregistré.', error)
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(storageKey, theme)
    } catch (error) {
      console.warn('Impossible d’enregistrer le thème choisi.', error)
    }
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
