import { BrowserRouter, HashRouter } from 'react-router-dom'
import { RepositoryProvider } from '../data/RepositoryProvider'
import { AppRoutes } from './routes'

export default function App() {
  const Router =
    window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <Router>
      <RepositoryProvider>
        <AppRoutes />
      </RepositoryProvider>
    </Router>
  )
}
