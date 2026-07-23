import {
  Boxes,
  GitBranch,
  History,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PanelLeftClose,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { RepositorySwitcher } from './RepositorySwitcher'

const navigation = [
  { to: '/overview', label: '项目概览', icon: LayoutDashboard },
  { to: '/workspace', label: '工作区', icon: Boxes },
  { to: '/stages', label: '版本阶段', icon: GitBranch },
  { to: '/release', label: '发布审核', icon: PackageCheck },
  { to: '/history', label: '历史记录', icon: History },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            IF
          </div>
          <div>
            <strong>Ironforge</strong>
            <span>工程师工作台</span>
          </div>
          <button className="icon-button sidebar__collapse" title="收起侧栏" type="button">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <RepositorySwitcher />

        <nav aria-label="主要导航" className="primary-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__profile">
          <div className="avatar" aria-hidden="true">
            蒋
          </div>
          <div>
            <strong>蒋枨</strong>
            <span>工程师 · GitLab 已连接</span>
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="icon-button" aria-label="打开导航" type="button">
          <Menu size={20} />
        </button>
        <strong>Ironforge</strong>
        <span className="mobile-header__stage">dev/T2</span>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
