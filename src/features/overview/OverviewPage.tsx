import {
  AlertTriangle,
  ArrowRight,
  CloudDownload,
  GitCommitHorizontal,
  PackageCheck,
  RefreshCw,
  Save,
} from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import {
  summarizeRepository,
  type RepositorySnapshot,
  type StatusTone,
} from '../../domain/repository'
import { WorkflowTimeline } from './WorkflowTimeline'
import './overview.css'

interface OverviewPageProps {
  repository: RepositorySnapshot
  refreshing?: boolean
  onRefresh?: () => void
}

const publishLabels: Record<
  RepositorySnapshot['publishJob']['status'],
  { label: string; tone: StatusTone }
> = {
  not_started: { label: '等待 MR 合入', tone: 'neutral' },
  running: { label: '发布中', tone: 'info' },
  failed: { label: '发布失败', tone: 'danger' },
  success: { label: '发布成功', tone: 'success' },
}

export function OverviewPage({
  repository,
  refreshing = false,
  onRefresh,
}: OverviewPageProps) {
  const sync = summarizeRepository(repository)
  const publish = publishLabels[repository.publishJob.status]
  const deletedCadCount = repository.changes.filter(
    (change) => change.kind === 'deleted' && change.isCad,
  ).length

  return (
    <div className="page page--overview">
      <header className="page-header">
        <div>
          <p className="eyebrow">工程师工作台</p>
          <h1>{repository.displayName}</h1>
          <p className="page-header__path">{repository.path}</p>
        </div>
        <div className="page-header__actions">
          <button
            className="button button--secondary"
            disabled={refreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={17} />
            {refreshing ? '正在刷新' : '刷新状态'}
          </button>
          <button className="button button--primary" type="button">
            <CloudDownload aria-hidden="true" size={17} />
            同步最新版本
          </button>
        </div>
      </header>

      <section aria-label="项目状态" className="status-strip">
        <div>
          <span>当前阶段</span>
          <strong>{repository.stage}</strong>
          <code>{repository.branch}</code>
        </div>
        <div>
          <span>本地修改</span>
          <strong>{repository.changes.length} 个文件</strong>
          <StatusBadge tone={deletedCadCount ? 'danger' : 'neutral'}>
            {deletedCadCount ? `${deletedCadCount} 个删除需确认` : '无危险删除'}
          </StatusBadge>
        </div>
        <div>
          <span>远程同步</span>
          <strong>{sync.syncLabel}</strong>
          <code>{repository.upstream}</code>
        </div>
        <div>
          <span>Ironforge</span>
          <strong>{publish.label}</strong>
          <StatusBadge tone={publish.tone}>
            {repository.publishJob.packageCount} 个交付包
          </StatusBadge>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>从修改到发布</h2>
            <p>业务动作和 Git 术语一一对应，当前停在第 2 步。</p>
          </div>
          <StatusBadge tone="warning">有本地修改</StatusBadge>
        </div>
        <WorkflowTimeline />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>接下来做什么</h2>
            <p>按当前仓库状态给出安全的下一步。</p>
          </div>
        </div>

        <div className="action-grid">
          <article className="action-item action-item--accent">
            <span className="action-item__icon" aria-hidden="true">
              <Save size={20} />
            </span>
            <div>
              <div className="action-item__title">
                <h3>保存设计版本</h3>
                <code>Commit</code>
              </div>
              <p>
                检查 {repository.changes.length} 个本地修改，逐项确认删除项，并填写这次改了什么。
              </p>
            </div>
            <button aria-label="进入保存设计版本" className="icon-button-light" type="button">
              <ArrowRight size={18} />
            </button>
          </article>

          <article className="action-item action-item--cyan">
            <span className="action-item__icon" aria-hidden="true">
              <GitCommitHorizontal size={20} />
            </span>
            <div>
              <div className="action-item__title">
                <h3>查看版本阶段</h3>
                <code>Branch</code>
              </div>
              <p>确认当前工作属于 T2，并查看它与 T1、main 的关系。</p>
            </div>
            <button aria-label="进入版本阶段" className="icon-button-light" type="button">
              <ArrowRight size={18} />
            </button>
          </article>

          <article className="action-item action-item--green">
            <span className="action-item__icon" aria-hidden="true">
              <PackageCheck size={20} />
            </span>
            <div>
              <div className="action-item__title">
                <h3>准备交付审核</h3>
                <code>Merge Request</code>
              </div>
              <p>选择 output 文件夹，校验配置，准备提交管理员审核。</p>
            </div>
            <button aria-label="进入发布审核" className="icon-button-light" type="button">
              <ArrowRight size={18} />
            </button>
          </article>
        </div>
      </section>

      {deletedCadCount ? (
        <aside className="safety-notice">
          <AlertTriangle aria-hidden="true" size={19} />
          <div>
            <strong>删除的 CAD 文件需要确认</strong>
            <p>Git 不知道这是设计意图还是误删。保存版本前必须由你逐项选择。</p>
          </div>
          <button className="button button--danger-quiet" type="button">
            查看删除项
          </button>
        </aside>
      ) : null}
    </div>
  )
}
