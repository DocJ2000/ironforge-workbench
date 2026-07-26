import {
  CheckCircle2,
  CloudDownload,
  FolderPlus,
  GitBranch,
  HardDrive,
  RefreshCw,
} from 'lucide-react'
import type { RegisteredProject } from '../../data/repositoryContext'
import { summarizeRepository } from '../../domain/repository'
import './tasks.css'
import './projectCenter.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
}

export function TaskHomePage({ projects, selectedId, onSelect }: Props) {
  const attentionCount = projects.filter(
    ({ repository }) =>
      repository.changes.length > 0 || repository.behind > 0,
  ).length

  return (
    <div className="task-page project-center">
      <header className="project-center__header">
        <div>
          <span className="task-eyebrow">项目中心</span>
          <h1>这台电脑上的项目</h1>
          <p>先选择当前项目，左侧的上传、交付和获取操作都会使用它。</p>
        </div>
        <div className="project-center__commands">
          <button className="button button--secondary" type="button">
            <FolderPlus size={17} />
            添加本地项目
          </button>
          <button className="button button--primary" type="button">
            <CloudDownload size={17} />
            从云端下载项目
          </button>
        </div>
      </header>

      {attentionCount ? (
        <div className="project-attention">
          <RefreshCw aria-hidden="true" size={17} />
          <strong>{attentionCount} 个项目需要处理</strong>
          <span>有本地文件未上传，或云端存在新内容。</span>
        </div>
      ) : null}

      <div className="project-list">
        {projects.map((project) => {
          const { repository } = project
          const current = project.id === selectedId
          const sync = summarizeRepository(repository)
          return (
            <article className={`project-row${current ? ' project-row--current' : ''}`} key={project.id}>
              <div className="project-row__identity">
                <span className="project-row__icon"><HardDrive size={20} /></span>
                <span>
                  <strong>{repository.displayName}</strong>
                  <small title={repository.path}>{repository.path}</small>
                </span>
              </div>
              <div className="project-row__facts">
                <span><GitBranch size={14} />{repository.branch}</span>
                <span>{repository.changes.length} 个本地改动</span>
                <span className={`project-state project-state--${sync.syncTone}`}>{sync.syncLabel}</span>
                {!project.connected ? <span className="project-state project-state--neutral">尚未连接</span> : null}
              </div>
              <div className="project-row__action">
                <small>最近打开：{project.lastOpened}</small>
                <button
                  className={current ? 'button button--quiet' : 'button button--secondary'}
                  disabled={current}
                  onClick={() => onSelect(project.id)}
                  type="button"
                >
                  {current ? <><CheckCircle2 size={16} />当前项目</> : '设为当前项目'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
