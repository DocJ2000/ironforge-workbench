import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { useRepository } from '../data/repositoryContext'
import { DeliveryPage } from '../features/delivery/DeliveryPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { ReleasePage } from '../features/release/ReleasePage'
import { StagesPage } from '../features/stages/StagesPage'
import { TaskHomePage } from '../features/tasks/TaskHomePage'

export function AppRoutes() {
  const { repository, loading, refresh } = useRepository()

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/workspace" />} />
        <Route
          path="/overview"
          element={
            <OverviewPage
              onRefresh={() => void refresh()}
              refreshing={loading}
              repository={repository}
            />
          }
        />
        <Route
          path="/workspace"
          element={<TaskHomePage repository={repository} />}
        />
        <Route path="/workspace/legacy" element={<DeliveryPage onRefresh={refresh} repository={repository} />} />
        <Route path="/stages" element={<StagesPage repository={repository} />} />
        <Route path="/release" element={<ReleasePage repository={repository} />} />
        <Route path="/history" element={<HistoryPage repository={repository} />} />
      </Route>
    </Routes>
  )
}
