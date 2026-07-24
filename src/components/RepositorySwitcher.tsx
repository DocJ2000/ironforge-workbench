import { ChevronDown, FolderGit2 } from 'lucide-react'
import type { RepositorySnapshot } from '../domain/repository'

export function RepositorySwitcher({ repository }: { repository: RepositorySnapshot }) {
  return (
    <button className="repository-switcher" type="button">
      <span className="repository-switcher__icon" aria-hidden="true">
        <FolderGit2 size={18} />
      </span>
      <span className="repository-switcher__copy">
        <strong>{repository.displayName}</strong>
        <small>{repository.gitlabPath}</small>
      </span>
      <ChevronDown aria-hidden="true" size={16} />
    </button>
  )
}
