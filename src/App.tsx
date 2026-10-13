import { Navigate, Route, Routes } from 'react-router-dom'
import { CardDialogProvider } from './components/CardDialogProvider'
import { SiteLayout } from './components/SiteLayout'
import { LocaleProvider } from './i18n/LocaleProvider'
import { useTheme } from './hooks/useTheme'
import { CardsPage } from './pages/CardsPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RulesPage } from './pages/RulesPage'
import { SoloPage } from './pages/SoloPage'
import './App.css'
import './styles/fantasy.css'
import './styles/immersion.css'
import './styles/buttons.css'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <LocaleProvider>
      <CardDialogProvider>
        <Routes>
          <Route element={<SiteLayout onToggleTheme={toggleTheme} theme={theme} />}>
            <Route index element={<HomePage />} />
            <Route path="mecaniques" element={<RulesPage />} />
            <Route path="cartes" element={<CardsPage />} />
            <Route path="cartes/:cardId" element={<Navigate replace to="/cartes" />} />
            <Route path="solo" element={<SoloPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CardDialogProvider>
    </LocaleProvider>
  )
}

export default App
