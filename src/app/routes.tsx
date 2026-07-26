import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { useRepository } from '../data/repositoryContext'
import { DeliveryPage } from '../features/delivery/DeliveryPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { ReleasePage } from '../features/release/ReleasePage'
import { StagesPage } from '../features/stages/StagesPage'
import { TaskHomePage } from '../features/tasks/TaskHomePage'
import { ProjectUploadPage } from '../features/tasks/ProjectUploadPage'
import { IronforgeDeliveryPage } from '../features/tasks/IronforgeDeliveryPage'
import { RetrievePage } from '../features/tasks/RetrievePage'
import { ProjectUnavailable } from '../features/tasks/ProjectUnavailable'
import { UploadEntryPage } from '../features/tasks/UploadEntryPage'
import { AccountPage } from '../features/account/AccountPage'
import { createDeliveryApi } from '../data/deliveryClient'

export function AppRoutes() {
  const {
    operationReady,
    addProject,
    projects,
    repository,
    selectedProjectId,
    selectProject,
    loading,
    refresh,
  } = useRepository()
  const projectDeliveryApi = createDeliveryApi(selectedProjectId)

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
          element={
            <TaskHomePage
              onSelect={selectProject}
              onAdd={addProject}
              projects={projects}
              selectedId={selectedProjectId}
            />
          }
        />
        <Route path="/workspace/legacy" element={<DeliveryPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} />} />
        <Route path="/workspace/upload" element={<UploadEntryPage onSelect={selectProject} projects={projects} selectedId={selectedProjectId} />} />
        <Route path="/workspace/upload/gitlab" element={operationReady ? <ProjectUploadPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/upload/ironforge" element={operationReady ? <IronforgeDeliveryPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/project-upload" element={<Navigate replace to="/workspace/upload/gitlab" />} />
        <Route path="/workspace/ironforge-delivery" element={<Navigate replace to="/workspace/upload/ironforge" />} />
        <Route path="/workspace/retrieve" element={<RetrievePage onSelect={selectProject} projects={projects} selectedId={selectedProjectId} />} />
        <Route path="/stages" element={<StagesPage repository={repository} />} />
        <Route path="/release" element={<ReleasePage repository={repository} />} />
        <Route path="/history" element={<HistoryPage repository={repository} />} />
        <Route
          path="/account"
          element={
            <AccountPage
              onSelect={selectProject}
              projects={projects}
              selectedId={selectedProjectId}
            />
          }
        />
      </Route>
    </Routes>
  )
}
