import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { getDemoRepository } from '../data/demoRepository'
import { HistoryPage } from '../features/history/HistoryPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { ReleasePage } from '../features/release/ReleasePage'
import { StagesPage } from '../features/stages/StagesPage'
import { WorkspacePage } from '../features/workspace/WorkspacePage'

export function AppRoutes() {
  const repository = getDemoRepository()

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/overview" />} />
        <Route path="/overview" element={<OverviewPage repository={repository} />} />
        <Route path="/workspace" element={<WorkspacePage repository={repository} />} />
        <Route path="/stages" element={<StagesPage repository={repository} />} />
        <Route path="/release" element={<ReleasePage repository={repository} />} />
        <Route path="/history" element={<HistoryPage repository={repository} />} />
      </Route>
    </Routes>
  )
}
