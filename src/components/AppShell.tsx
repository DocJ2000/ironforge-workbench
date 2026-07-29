import {
  Factory,
  FolderKanban,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigationMemoryClient } from '../data/navigationMemoryClient'

export function AppShell() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [gitLabDestination, setGitLabDestination] = useState(
    () => navigationMemoryClient.gitLabDestination(),
  )
  const navigation = [
    { to: gitLabDestination, label: 'GitLab', icon: FolderKanban, end: false },
    { to: '/ironforge', label: '铁炉堡', icon: Factory, end: true },
  ]

  useEffect(() => {
    if (
      location.pathname === '/history'
      || location.pathname === '/stages'
      || location.pathname.startsWith('/workspace')
    ) {
      navigationMemoryClient.rememberGitLab(location.pathname)
      setGitLabDestination(location.pathname)
    }
  }, [location.pathname])
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

        <nav aria-label="主要导航" className="primary-nav">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              end={end}
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

        <NavLink className="sidebar__profile" to="/account">
          <div className="avatar" aria-hidden="true">
            <UserRound size={18} />
          </div>
          <div>
            <strong>本机用户</strong>
            <span>账户与连接</span>
          </div>
          <Settings aria-hidden="true" size={16} />
        </NavLink>
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
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
