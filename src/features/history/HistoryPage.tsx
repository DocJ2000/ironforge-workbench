import {
  CheckCircle2,
  CloudUpload,
  Filter,
  GitCommitHorizontal,
  GitMerge,
  PackageCheck,
  Search,
} from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import type { HistoryEvent, RepositorySnapshot } from '../../domain/repository'
import type { RegisteredProject } from '../../data/repositoryContext'
import './history.css'

interface HistoryPageProps {
  repository: RepositorySnapshot
  projects?: RegisteredProject[]
  selectedId?: string
  onSelect?: (id: string) => void
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

export function HistoryPage({
  repository,
  projects = [],
  selectedId = repository.id,
  onSelect,
}: HistoryPageProps) {
  return (
    <div className="page page--history">
      <header className="page-header">
        <div>
          <p className="eyebrow">项目记录</p>
          <h1>项目操作记录</h1>
          <p className="page-header__path">
            每次保存、上传、审核和发布都会留下记录。
          </p>
        </div>
        <StatusBadge tone="info">{repository.history.length} 条记录</StatusBadge>
      </header>

      {projects.length ? (
        <section className="history-project-picker">
          <label className="plain-field">
            <span>查看哪个项目的记录</span>
            <select
              aria-label="查看哪个项目的记录"
              onChange={(event) => onSelect?.(event.target.value)}
              value={selectedId}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.repository.displayName}
                </option>
              ))}
            </select>
          </label>
          <p>下面只显示所选项目的保存、上传、审核和发布记录。</p>
        </section>
      ) : null}

      <section className="history-summary">
        <div>
          <span>当前项目</span>
          <strong>{repository.displayName}</strong>
        </div>
        <div>
          <span>操作记录</span>
          <strong>{repository.history.length} 条</strong>
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
            <p>按发生顺序展示项目保存、审核和铁炉堡发布状态。</p>
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
          {repository.history.map((event) => {
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
