import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { CardDialogProvider } from './components/CardDialogProvider'
import { SiteLayout } from './components/SiteLayout'
import { LocaleProvider } from './i18n/LocaleProvider'
import { useTheme } from './hooks/useTheme'
import { CardsPage } from './pages/CardsPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'
import './styles/fantasy.css'
import './styles/immersion.css'
import './styles/buttons.css'

const SoloPage = lazy(() => import('./pages/SoloPage').then(module => ({ default: module.SoloPage })))
const RulesPage = lazy(() => import('./pages/RulesPage').then(module => ({ default: module.RulesPage })))

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <LocaleProvider>
      <CardDialogProvider>
        <Routes>
          <Route element={<SiteLayout onToggleTheme={toggleTheme} theme={theme} />}>
            <Route index element={<HomePage />} />
            <Route path="mecaniques" element={<Suspense fallback={<div className="page-wrap" role="status">Ossuaire…</div>}><RulesPage /></Suspense>} />
            <Route path="cartes" element={<CardsPage />} />
            <Route path="cartes/:cardId" element={<Navigate replace to="/cartes" />} />
            <Route path="solo" element={<Suspense fallback={<div className="page-wrap" role="status">Ossuaire…</div>}><SoloPage /></Suspense>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CardDialogProvider>
    </LocaleProvider>
  )
}

export default App
