import {
  Boxes,
  GitBranch,
  History,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { useState } from 'react'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <aside
        aria-label="项目导航"
        className={`sidebar${mobileNavOpen ? ' sidebar--mobile-open' : ''}`}
      >
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            IF
          </div>
          <div>
            <strong>Ironforge</strong>
            <span>工程师工作台</span>
          </div>
          <button
            aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            className="icon-button sidebar__collapse"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            type="button"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            aria-label="关闭导航"
            className="icon-button sidebar__mobile-close"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <RepositorySwitcher />

        <nav aria-label="主要导航" className="primary-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} onClick={() => setMobileNavOpen(false)} title={label} to={to}>
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

      {mobileNavOpen ? (
        <button
          aria-label="关闭导航"
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}

      <header className="mobile-header">
        <button
          className="icon-button"
          aria-label="打开导航"
          onClick={() => setMobileNavOpen(true)}
          type="button"
        >
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
