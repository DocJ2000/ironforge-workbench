import { BrowserRouter } from 'react-router-dom'
import { RepositoryProvider } from '../data/RepositoryProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <RepositoryProvider>
        <AppRoutes />
      </RepositoryProvider>
    </BrowserRouter>
  )
}
