import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const cardRoute = /^\/cartes(\/|$)/

// Les pages de cartes conservent leur position : seule la navigation entre pages remonte en haut.
export function ScrollToTop() {
  const { pathname } = useLocation()
  const section = cardRoute.test(pathname) ? 'cards' : pathname

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [section])

  return null
}
