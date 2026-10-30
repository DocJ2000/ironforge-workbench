import { lazy, Suspense, useMemo, type ReactNode } from 'react'
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
const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const IronforgeDeliveryPage = lazy(() => import('../features/tasks/IronforgeDeliveryPage').then((module) => ({ default: module.IronforgeDeliveryPage })))
const IronforgePortalPage = lazy(() => import('../features/tasks/IronforgePortalPage').then((module) => ({ default: module.IronforgePortalPage })))
const ProjectActionsPage = lazy(() => import('../features/tasks/ProjectActionsPage').then((module) => ({ default: module.ProjectActionsPage })))
const ProjectUploadPage = lazy(() => import('../features/tasks/ProjectUploadPage').then((module) => ({ default: module.ProjectUploadPage })))
const RetrievePage = lazy(() => import('../features/tasks/RetrievePage').then((module) => ({ default: module.RetrievePage })))
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
    refresh,
    refreshProject,
    refreshRemote,
  } = useRepository()
  // A new API object on every render used to retrigger the page effects
  // (`[api, …]`) and refetch data the page already had.
  const projectDeliveryApi = useMemo(
    () => createDeliveryApi(selectedProjectId),
    [selectedProjectId],
  )
  // Page actions only need the project they are working on. Re-reading every
  // registered project made each upload, checkout or history visit re-scan the
  // whole list.
  const refreshProjectNow = () => refreshProject(selectedProjectId)

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
          path="/workspace"
          element={
            <DeferredPage><TaskHomePage
              onSelect={selectProject}
              onAdd={addProject}
              onRemove={removeProject}
              onRefresh={refreshRemote}
              projects={projects}
              selectedId={selectedProjectId}
            /></DeferredPage>
          }
        />
        <Route path="/workspace/project" element={<DeferredPage><ProjectActionsPage api={projectDeliveryApi} onRefresh={refreshProjectNow} repository={repository} /></DeferredPage>} />
        <Route path="/workspace/download-new" element={<CredentialGate projectId="computer"><CloneProjectPage api={projectDeliveryApi} onRefresh={refresh} /></CredentialGate>} />
        <Route path="/ironforge" element={<DeferredPage><IronforgePortalPage /></DeferredPage>} />
        <Route path="/workspace/upload" element={<Navigate replace to="/workspace/project" />} />
        <Route path="/workspace/upload/gitlab" element={operationReady ? <CredentialGate projectId={selectedProjectId}><ProjectUploadPage api={projectDeliveryApi} onRefresh={refreshProjectNow} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/upload/ironforge" element={operationReady ? <CredentialGate projectId={selectedProjectId}><IronforgeDeliveryPage api={projectDeliveryApi} onRefresh={refreshProjectNow} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/workspace/project-upload" element={<Navigate replace to="/workspace/upload/gitlab" />} />
        <Route path="/workspace/ironforge-delivery" element={<Navigate replace to="/workspace/upload/ironforge" />} />
        <Route path="/workspace/retrieve" element={operationReady ? <CredentialGate projectId={selectedProjectId}><RetrievePage api={projectDeliveryApi} onRefresh={refreshProjectNow} repository={repository} /></CredentialGate> : <ProjectUnavailable repository={repository} />} />
        <Route path="/history" element={operationReady ? <HistoryPage onRefresh={refreshProjectNow} projectId={selectedProjectId} repository={repository} /> : <ProjectUnavailable repository={repository} />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  )
}

