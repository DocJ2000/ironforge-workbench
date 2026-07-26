import { Check, ChevronDown, FolderGit2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RegisteredProject } from '../data/repositoryContext'
import './repositorySwitcher.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
}

export function RepositorySwitcher({ projects, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected =
    projects.find((project) => project.id === selectedId) ?? projects[0]

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="repository-switcher-wrap" ref={root}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="repository-switcher"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="repository-switcher__icon" aria-hidden="true">
          <FolderGit2 size={18} />
        </span>
        <span className="repository-switcher__copy">
          <strong>{selected.repository.displayName}</strong>
          <small>{selected.repository.gitlabPath}</small>
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div aria-label="切换当前项目" className="project-switch-menu" role="listbox">
          {projects.map((project) => (
            <button
              aria-selected={project.id === selectedId}
              key={project.id}
              onClick={() => {
                onSelect(project.id)
                setOpen(false)
              }}
              role="option"
              type="button"
            >
              <span>
                <strong>{project.repository.displayName}</strong>
                <small>
                  {project.repository.branch}
                  {!project.connected ? ' · 尚未连接' : ''}
                </small>
              </span>
              {project.id === selectedId ? <Check size={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
