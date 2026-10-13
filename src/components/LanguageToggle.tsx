import { useLocale } from '../hooks/useLocale'

export function LanguageToggle() {
  const { locale, toggleLocale } = useLocale()
  const nextLocale = locale === 'fr' ? 'en' : 'fr'

  return (
    <button
      aria-label={nextLocale === 'en' ? 'Switch language to English' : 'Passer la langue en français'}
      className="language-toggle"
      onClick={toggleLocale}
      type="button"
    >
      <span aria-hidden="true">{locale === 'fr' ? 'EN' : 'FR'}</span>
    </button>
  )
}
