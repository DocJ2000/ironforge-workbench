import { AlertTriangle, Filter, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import type { RepositorySnapshot } from '../../domain/repository'
import { ChangeTable } from './ChangeTable'
import { CommitPanel } from './CommitPanel'
import './workspace.css'

interface WorkspacePageProps {
  repository: RepositorySnapshot
}

export function WorkspacePage({ repository }: WorkspacePageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmedDeletionIds, setConfirmedDeletionIds] = useState<Set<string>>(
    new Set(),
  )
  const [commitMessage, setCommitMessage] = useState('')

  const deletedCadIds = useMemo(
    () =>
      new Set(
        repository.changes
          .filter((change) => change.kind === 'deleted' && change.isCad)
          .map((change) => change.id),
      ),
    [repository.changes],
  )

  const selectedDeletedCadIds = [...selectedIds].filter((id) => deletedCadIds.has(id))
  const deletionsConfirmed = selectedDeletedCadIds.every((id) =>
    confirmedDeletionIds.has(id),
  )
  const commitDisabled =
    selectedIds.size === 0 || commitMessage.trim().length === 0 || !deletionsConfirmed

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleDeletionConfirmation(id: string) {
    setConfirmedDeletionIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="page page--workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">Working tree · 本地工作区</p>
          <h1>检查本地修改</h1>
          <p className="page-header__path">
            这些文件还只存在于你的电脑，GitLab 尚未收到。
          </p>
        </div>
        <button className="button button--secondary" type="button">
          <RefreshCw aria-hidden="true" size={17} />
          重新扫描
        </button>
      </header>

      <aside className="workspace-warning">
        <AlertTriangle aria-hidden="true" size={19} />
        <div>
          <strong>删除的 CAD 文件需要逐项确认</strong>
          <p>Git 无法判断删除是设计意图还是误操作，因此不会自动选择。</p>
        </div>
        <StatusBadge tone="danger">
          {deletedCadIds.size} 个文件
        </StatusBadge>
      </aside>

      <div className="workspace-layout">
        <section className="workspace-files">
          <div className="workspace-toolbar">
            <div>
              <h2>文件修改</h2>
              <span>{repository.changes.length} 项待处理</span>
            </div>
            <div className="workspace-toolbar__tools">
              <label className="search-field">
                <Search aria-hidden="true" size={15} />
                <input aria-label="搜索修改文件" placeholder="搜索文件" />
              </label>
              <button className="icon-button-light" title="筛选文件" type="button">
                <Filter size={17} />
              </button>
            </div>
          </div>

          <ChangeTable
            changes={repository.changes}
            confirmedDeletionIds={confirmedDeletionIds}
            onConfirmDeletion={toggleDeletionConfirmation}
            onToggle={toggleSelected}
            selectedIds={selectedIds}
          />
        </section>

        <CommitPanel
          branch={repository.branch}
          commitMessage={commitMessage}
          disabled={commitDisabled}
          onMessageChange={setCommitMessage}
          selectedCount={selectedIds.size}
        />
      </div>
    </div>
  )
}
