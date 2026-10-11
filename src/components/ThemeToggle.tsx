import type { Theme } from '../hooks/useTheme'
import { useLocale } from '../i18n/LocaleProvider'

type ThemeToggleProps = {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useLocale()

  return (
    <button
      aria-label={t(theme === 'dark' ? 'theme.activateLight' : 'theme.activateDark')}
      aria-pressed={theme === 'light'}
      className="theme-toggle"
      onClick={onToggle}
      title={t(theme === 'dark' ? 'theme.activateLight' : 'theme.activateDark')}
      type="button"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
      <span className="theme-toggle-label">{t(theme === 'dark' ? 'theme.light' : 'theme.dark')}</span>
    </button>
  )
}
