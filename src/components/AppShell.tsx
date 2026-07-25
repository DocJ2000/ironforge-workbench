import {
  History,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useRepository } from '../data/repositoryContext'
import { RepositorySwitcher } from './RepositorySwitcher'

const navigation = [
  { to: '/workspace', label: '交付', icon: PackageCheck },
  { to: '/history', label: '历史记录', icon: History },
]

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { error, repository, source } = useRepository()

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
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
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

        <RepositorySwitcher repository={repository} />
        <div
          className={`repository-source repository-source--${source}`}
          title={error ?? '正在读取本地 Git 仓库'}
        >
          <span aria-hidden="true" />
          {source === 'live' ? '本地仓库实时数据' : '演示数据'}
        </div>

        <nav aria-label="主要导航" className="primary-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              onClick={() => setMobileNavOpen(false)}
              title={label}
              to={to}
            >
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
            <strong>蒋成</strong>
            <span>工程师 · GitLab</span>
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
          aria-label="打开导航"
          className="icon-button"
          onClick={() => setMobileNavOpen(true)}
          type="button"
        >
          <Menu size={20} />
        </button>
        <strong>Ironforge</strong>
        <span className="mobile-header__stage">{repository.branch}</span>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
