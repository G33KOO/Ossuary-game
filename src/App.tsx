import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/SiteLayout'
import { LocaleProvider } from './i18n/LocaleProvider'
import { useTheme } from './hooks/useTheme'
import { CardsPage } from './pages/CardsPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RulesPage } from './pages/RulesPage'
import { SoloPage } from './pages/SoloPage'
import './App.css'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <LocaleProvider>
      <Routes>
        <Route element={<SiteLayout onToggleTheme={toggleTheme} theme={theme} />}>
          <Route index element={<HomePage />} />
          <Route path="mecaniques" element={<RulesPage />} />
          <Route path="cartes" element={<CardsPage />}>
            <Route path=":cardId" element={null} />
          </Route>
          <Route path="solo" element={<SoloPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </LocaleProvider>
  )
}

export default App
