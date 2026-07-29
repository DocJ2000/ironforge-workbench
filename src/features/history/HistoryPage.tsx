import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  GitCommitHorizontal,
  GitMerge,
  PackageCheck,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import { fetchGitLabHistory } from '../../data/historyClient'
import type { HistoryEvent, RepositorySnapshot } from '../../domain/repository'
import './history.css'

interface HistoryPageProps {
  repository: RepositorySnapshot
  projectId?: string
  onRefresh?: () => Promise<void>
}

const eventIcons: Record<HistoryEvent['type'], typeof GitCommitHorizontal> = {
  commit: GitCommitHorizontal,
  push: CloudUpload,
  merge_request: GitMerge,
  merge: CheckCircle2,
  publish: PackageCheck,
}

const eventTerms: Record<HistoryEvent['type'], string> = {
  commit: '保存修改',
  push: '上传项目',
  merge_request: '提交管理员审核',
  merge: '管理员批准',
  publish: '发布到铁炉堡',
}

export function HistoryPage({ repository, projectId, onRefresh }: HistoryPageProps) {
  const [history, setHistory] = useState(repository.history)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
  const visibleHistory = normalizedQuery
    ? history.filter((event) => [
      event.title,
      event.description,
      event.actor,
      event.reference,
      ...(event.branches ?? []),
    ].some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery)))
    : history

  function refreshHistory() {
    if (!projectId) return
    setLoading(true)
    setError(null)
    void Promise.all([
      fetchGitLabHistory(projectId),
      onRefresh?.() ?? Promise.resolve(),
    ])
      .then(([events]) => setHistory(events))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法读取 GitLab 历史'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshHistory()
    // The selected project is the refresh boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])
  return (
    <div className="page page--history">
      <Link className="project-actions__back" to="/workspace/project">
        <ArrowLeft size={17} />
        返回项目操作
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">项目记录</p>
          <h1>项目操作记录</h1>
          <p className="page-header__path">
            每次保存、上传、审核和发布都会留下记录。
          </p>
        </div>
        <div className="history-header-actions">
          <StatusBadge tone="info">{loading ? '正在读取 GitLab' : `${history.length} 条记录`}</StatusBadge>
          {projectId ? <button className="button button--secondary" disabled={loading} onClick={refreshHistory} type="button"><RefreshCw size={16} />{loading ? '正在刷新' : '刷新记录'}</button> : null}
        </div>
      </header>

      <section className="history-summary">
        <div>
          <span>当前项目</span>
          <strong>{repository.displayName}</strong>
        </div>
        <div>
          <span>操作记录</span>
          <strong>{loading ? '正在读取' : `${history.length} 条`}</strong>
        </div>
        <div>
          <span>管理员审核</span>
          <strong>{repository.mergeRequest.status === 'waiting' ? '等待审核' : repository.mergeRequest.status === 'approved' ? '已批准' : repository.mergeRequest.status === 'merged' ? '已完成' : '尚未提交'}</strong>
        </div>
        <div>
          <span>铁炉堡发布</span>
          <strong>{repository.publishJob.status === 'success' ? '已发布' : repository.publishJob.status === 'running' ? '正在发布' : repository.publishJob.status === 'failed' ? '发布失败' : '尚未开始'}</strong>
        </div>
      </section>

      <details className="advanced-connection history-professional">
        <summary>专业显示</summary>
        <dl className="confirm-list">
          <div><dt>工作版本</dt><dd>{repository.branch}</dd></div>
          <div><dt>保存编号</dt><dd>{repository.latestCommit}</dd></div>
          <div><dt>审核单编号</dt><dd>#{repository.mergeRequest.id}</dd></div>
          <div><dt>发布任务编号</dt><dd>{repository.publishJob.id}</dd></div>
        </dl>
      </details>

      {repository.ahead > 0 ? <section className="history-pending">
        <CloudUpload size={22} />
        <div><strong>这台电脑有 {repository.ahead} 次更新尚未上传</strong><p>{repository.latestCommitMessage}</p></div>
        <Link className="button button--primary" to="/workspace/upload/gitlab">继续上传</Link>
      </section> : null}

      <section className="history-section">
        <div className="history-toolbar">
          <div>
            <h2>操作时间线</h2>
            <p>直接读取 GitLab 上的项目提交记录，最新记录显示在最上方。</p>
          </div>
          <div className="history-toolbar__tools">
            <label className="search-field">
              <Search aria-hidden="true" size={15} />
              <input
                aria-label="搜索历史"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索说明、人员、编号或工作版本"
                value={query}
              />
            </label>
          </div>
        </div>

        <div className="history-table">
          <div className="history-table__header">
            <span>动作</span>
            <span>说明</span>
            <span>操作人</span>
            <span>时间</span>
            <span>引用</span>
          </div>
          {error ? <div className="workspace-feedback workspace-feedback--error">{error}</div> : null}
          {!loading && !error && history.length === 0 ? <div className="workspace-feedback">GitLab 上还没有提交记录。</div> : null}
          {!loading && !error && history.length > 0 && visibleHistory.length === 0 ? <div className="workspace-feedback">没有找到符合条件的记录。</div> : null}
          {visibleHistory.map((event) => {
            const Icon = eventIcons[event.type]
            return (
              <div className="history-row" key={event.id}>
                <div className={`history-action history-action--${event.tone}`}>
                  <span aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <code>{eventTerms[event.type]}</code>
                  </div>
                </div>
                <span className="history-row__description">{event.description}</span>
                <span>{event.actor}</span>
                <span>{event.timestamp}</span>
                <div className="history-row__reference"><code>{event.reference}</code>{event.branches?.length ? <span className="history-branch" data-testid={`history-branches-${event.id}`}>{event.branches.join('、')}</span> : null}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
