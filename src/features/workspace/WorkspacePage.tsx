import { AlertTriangle, Filter, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import {
  repositoryCommitApi,
  type CommitApi,
  type CommitPreview,
  type CommitRequest,
} from '../../data/commitClient'
import type { RepositorySnapshot } from '../../domain/repository'
import { ChangeTable } from './ChangeTable'
import { CommitConfirmationDialog } from './CommitConfirmationDialog'
import { CommitPanel } from './CommitPanel'
import './workspace.css'

interface WorkspacePageProps {
  repository: RepositorySnapshot
  commitApi?: CommitApi
  onRepositoryRefresh?: () => Promise<void>
}

export function WorkspacePage({
  repository,
  commitApi = repositoryCommitApi,
  onRepositoryRefresh,
}: WorkspacePageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmedDeletionIds, setConfirmedDeletionIds] = useState<Set<string>>(
    new Set(),
  )
  const [commitMessage, setCommitMessage] = useState('')
  const [preview, setPreview] = useState<CommitPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  function commitRequest(): CommitRequest {
    const changesById = new Map(repository.changes.map((change) => [change.id, change]))
    return {
      message: commitMessage,
      paths: [...selectedIds]
        .map((id) => changesById.get(id)?.path)
        .filter((path): path is string => Boolean(path)),
      confirmedDeletions: [...confirmedDeletionIds]
        .map((id) => changesById.get(id)?.path)
        .filter((path): path is string => Boolean(path)),
    }
  }

  async function handlePreview() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      setPreview(await commitApi.preview(commitRequest()))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法预览本次保存内容')
    } finally {
      setBusy(false)
    }
  }

  async function handleCommit() {
    setBusy(true)
    setError(null)
    try {
      const result = await commitApi.commit(commitRequest())
      setPreview(null)
      setSelectedIds(new Set())
      setConfirmedDeletionIds(new Set())
      setCommitMessage('')
      setSuccess(`已保存为 ${result.commit}`)
      await onRepositoryRefresh?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存本次修改失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">这台电脑上的修改</p>
          <h1>检查本地修改</h1>
          <p className="page-header__path">
            这些文件还只存在于你的电脑，公司项目服务器尚未收到。
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
          <p>软件无法判断删除是设计意图还是误操作，因此不会自动选择。</p>
        </div>
        <StatusBadge tone="danger">
          {deletedCadIds.size} 个文件
        </StatusBadge>
      </aside>

      {error ? <div className="workspace-feedback workspace-feedback--error">{error}</div> : null}
      {success ? (
        <div className="workspace-feedback workspace-feedback--success">{success}</div>
      ) : null}

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
          busy={busy}
          onMessageChange={setCommitMessage}
          onSubmit={() => void handlePreview()}
          selectedCount={selectedIds.size}
        />
      </div>

      {preview ? (
        <CommitConfirmationDialog
          busy={busy}
          onCancel={() => setPreview(null)}
          onConfirm={() => void handleCommit()}
          preview={preview}
        />
      ) : null}
    </div>
  )
}
