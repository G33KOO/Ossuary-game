import { Outlet } from 'react-router-dom'
import type { Theme } from '../hooks/useTheme'
import { ScrollToTop } from './ScrollToTop'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

type SiteLayoutProps = {
  theme: Theme
  onToggleTheme: () => void
}

export function SiteLayout({ theme, onToggleTheme }: SiteLayoutProps) {
  return (
    <>
      <ScrollToTop />
      <SiteHeader onToggleTheme={onToggleTheme} theme={theme} />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}
