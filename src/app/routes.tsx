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
import { ProjectActionsPage } from '../features/tasks/ProjectActionsPage'
import { IronforgePortalPage } from '../features/tasks/IronforgePortalPage'
import { CloneProjectPage } from '../features/tasks/CloneProjectPage'
import { AccountPage } from '../features/account/AccountPage'
import { CredentialGate } from '../features/account/CredentialGate'
import { RequiredSetupGate } from '../features/account/RequiredSetupGate'
import { createDeliveryApi } from '../data/deliveryClient'
import { getDemoRepository } from '../data/demoRepository'

export function AppRoutes() {
  const {
    operationReady,
    addProject,
    removeProject,
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
        <Route
          path="/account"
          element={<AccountPage checkProjectId={selectedProjectId} />}
        />
        {import.meta.env.DEV ? <Route path="/preview/upload-review" element={<ProjectUploadPage repository={getDemoRepository()} />} /> : null}
        <Route element={<RequiredSetupGate />}>
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
              onRemove={removeProject}
              onRefresh={refresh}
              projects={projects}
              selectedId={selectedProjectId}
            />
          }
        />
        <Route path="/workspace/legacy" element={<DeliveryPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} />} />
        <Route path="/workspace/project" element={<ProjectActionsPage repository={repository} />} />
        <Route path="/workspace/download-new" element={<CredentialGate projectId="computer"><CloneProjectPage api={projectDeliveryApi} onRefresh={refresh} /></CredentialGate>} />
        <Route path="/ironforge" element={<IronforgePortalPage />} />
        <Route path="/workspace/upload" element={<Navigate replace to="/workspace/project" />} />
        <Route path="/workspace/upload/gitlab" element={operationReady ? <CredentialGate projectId={selectedProjectId}><ProjectUploadPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/upload/ironforge" element={operationReady ? <CredentialGate projectId={selectedProjectId}><IronforgeDeliveryPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/project-upload" element={<Navigate replace to="/workspace/upload/gitlab" />} />
        <Route path="/workspace/ironforge-delivery" element={<Navigate replace to="/workspace/upload/ironforge" />} />
        <Route path="/workspace/retrieve" element={operationReady ? <CredentialGate projectId={selectedProjectId}><RetrievePage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/stages" element={<StagesPage repository={repository} />} />
        <Route path="/release" element={<ReleasePage repository={repository} />} />
        <Route path="/history" element={operationReady ? <HistoryPage onRefresh={refresh} projectId={selectedProjectId} repository={repository} /> : <ProjectUnavailable repository={repository} />} />
        </Route>
      </Route>
    </Routes>
  )
}
