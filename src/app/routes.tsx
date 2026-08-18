import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { useRepository } from '../data/repositoryContext'
import { ProjectUnavailable } from '../features/tasks/ProjectUnavailable'
import { CredentialGate } from '../features/account/CredentialGate'
import { RequiredSetupGate } from '../features/account/RequiredSetupGate'
import { createDeliveryApi } from '../data/deliveryClient'
import { getDemoRepository } from '../data/demoRepository'

const AccountPage = lazy(() => import('../features/account/AccountPage').then((module) => ({ default: module.AccountPage })))
const CloneProjectPage = lazy(() => import('../features/tasks/CloneProjectPage').then((module) => ({ default: module.CloneProjectPage })))
const DeliveryPage = lazy(() => import('../features/delivery/DeliveryPage').then((module) => ({ default: module.DeliveryPage })))
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const IronforgeDeliveryPage = lazy(() => import('../features/tasks/IronforgeDeliveryPage').then((module) => ({ default: module.IronforgeDeliveryPage })))
const IronforgePortalPage = lazy(() => import('../features/tasks/IronforgePortalPage').then((module) => ({ default: module.IronforgePortalPage })))
const OverviewPage = lazy(() => import('../features/overview/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const ProjectActionsPage = lazy(() => import('../features/tasks/ProjectActionsPage').then((module) => ({ default: module.ProjectActionsPage })))
const ProjectUploadPage = lazy(() => import('../features/tasks/ProjectUploadPage').then((module) => ({ default: module.ProjectUploadPage })))
const ReleasePage = lazy(() => import('../features/release/ReleasePage').then((module) => ({ default: module.ReleasePage })))
const RetrievePage = lazy(() => import('../features/tasks/RetrievePage').then((module) => ({ default: module.RetrievePage })))
const StagesPage = lazy(() => import('../features/stages/StagesPage').then((module) => ({ default: module.StagesPage })))
const TaskHomePage = lazy(() => import('../features/tasks/TaskHomePage').then((module) => ({ default: module.TaskHomePage })))

function DeferredPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="page-loading" role="status">正在打开页面</div>}>
      {children}
    </Suspense>
  )
}

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
    <Suspense fallback={<div className="page-loading" role="status">正在打开页面</div>}>
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/account"
          element={<DeferredPage><AccountPage checkProjectId={selectedProjectId} /></DeferredPage>}
        />
        {import.meta.env.DEV ? <Route path="/preview/upload-review" element={<ProjectUploadPage repository={getDemoRepository()} />} /> : null}
        <Route element={<RequiredSetupGate />}>
        <Route index element={<Navigate replace to="/workspace" />} />
        <Route
          path="/overview"
          element={
            <DeferredPage><OverviewPage
              onRefresh={() => void refresh()}
              refreshing={loading}
              repository={repository}
            /></DeferredPage>
          }
        />
        <Route
          path="/workspace"
          element={
            <DeferredPage><TaskHomePage
              onSelect={selectProject}
              onAdd={addProject}
              onRemove={removeProject}
              onRefresh={refresh}
              projects={projects}
              selectedId={selectedProjectId}
            /></DeferredPage>
          }
        />
        <Route path="/workspace/legacy" element={<DeferredPage><DeliveryPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /></DeferredPage>} />
        <Route path="/workspace/project" element={<DeferredPage><ProjectActionsPage api={projectDeliveryApi} onRefresh={refresh} repository={repository} /></DeferredPage>} />
        <Route path="/workspace/download-new" element={<CredentialGate projectId="computer"><CloneProjectPage api={projectDeliveryApi} onRefresh={refresh} /></CredentialGate>} />
        <Route path="/ironforge" element={<DeferredPage><IronforgePortalPage /></DeferredPage>} />
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
    </Suspense>
  )
}
