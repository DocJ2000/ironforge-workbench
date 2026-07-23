import {
  ArrowRight,
  CircleDot,
  GitBranch,
  GitFork,
  Info,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import type { RepositorySnapshot } from '../../domain/repository'
import './stages.css'

interface StagesPageProps {
  repository: RepositorySnapshot
}

export function StagesPage({ repository }: StagesPageProps) {
  return (
    <div className="page page--stages">
      <header className="page-header">
        <div>
          <p className="eyebrow">Branch · 版本阶段</p>
          <h1>管理 T1、T2 和正式主线</h1>
          <p className="page-header__path">
            分支是一条独立的设计演进路线，不是空文件夹。
          </p>
        </div>
        <button className="button button--primary" type="button">
          <Plus aria-hidden="true" size={17} />
          创建新阶段
        </button>
      </header>

      <aside className="stage-explainer">
        <Info aria-hidden="true" size={19} />
        <div>
          <strong>新分支创建时会继承基础分支已经提交的文件</strong>
          <p>
            例如从 dev/T1 创建 dev/T2，刚创建时两边内容完全相同。之后各自 Commit，
            差异才会出现。
          </p>
        </div>
      </aside>

      <section className="branch-map">
        <div className="section-heading">
          <div>
            <h2>项目版本路线</h2>
            <p>当前工作位于 dev/T2，正式内容通过 MR 合入 main。</p>
          </div>
          <StatusBadge tone="info">{repository.branches.length} 条分支</StatusBadge>
        </div>

        <div className="branch-flow">
          <div className="branch-node branch-node--main">
            <span className="branch-node__icon" aria-hidden="true">
              <ShieldCheck size={19} />
            </span>
            <div>
              <span>正式主线</span>
              <strong>main</strong>
              <code>279fb1e</code>
            </div>
          </div>
          <ArrowRight aria-hidden="true" className="branch-flow__arrow" />
          <div className="branch-node branch-node--frozen">
            <span className="branch-node__icon" aria-hidden="true">
              <GitFork size={19} />
            </span>
            <div>
              <span>T1 冻结</span>
              <strong>dev/T1</strong>
              <code>cdc0dd5</code>
            </div>
          </div>
          <ArrowRight aria-hidden="true" className="branch-flow__arrow" />
          <div className="branch-node branch-node--current">
            <span className="branch-node__icon" aria-hidden="true">
              <CircleDot size={19} />
            </span>
            <div>
              <span>正在工作</span>
              <strong>dev/T2</strong>
              <code>879e5bf</code>
            </div>
            <StatusBadge tone="warning">当前</StatusBadge>
          </div>
        </div>
      </section>

      <section className="branch-list-section">
        <div className="section-heading">
          <div>
            <h2>全部分支</h2>
            <p>本地和 GitLab 远程状态并排显示。</p>
          </div>
        </div>

        <div className="branch-list">
          <div className="branch-list__header">
            <span>阶段 / 分支</span>
            <span>最新版本</span>
            <span>更新时间</span>
            <span>远程状态</span>
            <span aria-hidden="true" />
          </div>
          {repository.branches.map((branch) => (
            <div className="branch-list__row" key={branch.name}>
              <div className="branch-identity">
                <span aria-hidden="true">
                  <GitBranch size={17} />
                </span>
                <div>
                  <strong>{branch.stage}</strong>
                  <code>{branch.name}</code>
                </div>
              </div>
              <div className="branch-commit">
                <code>{branch.commit}</code>
                <span>{branch.commitMessage}</span>
              </div>
              <span>{branch.updatedAt}</span>
              <StatusBadge tone={branch.remote ? 'success' : 'warning'}>
                {branch.remote ? 'GitLab 已存在' : '仅本地'}
              </StatusBadge>
              <button
                aria-label={`查看 ${branch.name}`}
                className="icon-button-light"
                type="button"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
