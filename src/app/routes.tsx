import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { getDemoRepository } from '../data/demoRepository'
import { OverviewPage } from '../features/overview/OverviewPage'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">Ironforge Workbench</p>
      <h1>{title}</h1>
      <p>该工作区正在接入真实仓库状态。</p>
    </section>
  )
}

export function AppRoutes() {
  const repository = getDemoRepository()

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/overview" />} />
        <Route path="/overview" element={<OverviewPage repository={repository} />} />
        <Route path="/workspace" element={<PlaceholderPage title="工作区" />} />
        <Route path="/stages" element={<PlaceholderPage title="版本阶段" />} />
        <Route path="/release" element={<PlaceholderPage title="发布审核" />} />
        <Route path="/history" element={<PlaceholderPage title="历史记录" />} />
      </Route>
    </Routes>
  )
}
