import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Filter,
  GitCommitHorizontal,
  GitMerge,
  PackageCheck,
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

export function HistoryPage({ repository, projectId }: HistoryPageProps) {
  const [history, setHistory] = useState(repository.history)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    void fetchGitLabHistory(projectId)
      .then(setHistory)
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法读取 GitLab 历史'))
      .finally(() => setLoading(false))
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
        <StatusBadge tone="info">{loading ? '正在读取 GitLab' : `${history.length} 条记录`}</StatusBadge>
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

      <section className="history-section">
        <div className="history-toolbar">
          <div>
            <h2>操作时间线</h2>
            <p>直接读取 GitLab 上的项目提交记录，最新记录显示在最上方。</p>
          </div>
          <div className="history-toolbar__tools">
            <label className="search-field">
              <Search aria-hidden="true" size={15} />
              <input aria-label="搜索历史" placeholder="搜索保存编号、审核单或说明" />
            </label>
            <button className="icon-button-light" title="筛选历史" type="button">
              <Filter size={17} />
            </button>
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
          {history.map((event) => {
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
                <code className="history-row__reference">{event.reference}</code>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
