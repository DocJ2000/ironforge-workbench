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
import './history.css'

interface HistoryPageProps {
  repository: RepositorySnapshot
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

export function HistoryPage({ repository }: HistoryPageProps) {
  return (
    <div className="page page--history">
      <header className="page-header">
        <div>
          <p className="eyebrow">项目记录</p>
          <h1>从设计修改到供应商交付</h1>
          <p className="page-header__path">
            每次保存、上传、审核和发布都会留下记录。
          </p>
        </div>
        <StatusBadge tone="info">{repository.history.length} 条记录</StatusBadge>
      </header>

      <section className="history-summary">
        <div>
          <span>当前工作版本</span>
          <strong>{repository.branch}</strong>
        </div>
        <div>
          <span>设计版本</span>
          <strong>{repository.latestCommit}</strong>
        </div>
        <div>
          <span>管理员审核单</span>
          <strong>#{repository.mergeRequest.id}</strong>
        </div>
        <div>
          <span>发布任务</span>
          <strong>{repository.publishJob.id}</strong>
        </div>
      </section>

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
