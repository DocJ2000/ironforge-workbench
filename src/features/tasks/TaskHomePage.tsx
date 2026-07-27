import {
  CheckCircle2,
  CloudDownload,
  FolderPlus,
  FolderOpen,
  GitBranch,
  HardDrive,
  RefreshCw,
} from 'lucide-react'
import type { RegisteredProject } from '../../data/repositoryContext'
import { summarizeRepository } from '../../domain/repository'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import './tasks.css'
import './projectCenter.css'
import './addProject.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (path: string) => Promise<void>
}

export function TaskHomePage({ projects, selectedId, onSelect, onAdd }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [path, setPath] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
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
          <button className="button button--secondary" onClick={() => setShowAdd((value) => !value)} type="button">
            <FolderPlus size={17} />
            添加本地项目
          </button>
          <Link className="button button--primary" to="/workspace/retrieve">
            <CloudDownload size={17} />
            从云端下载项目
          </Link>
        </div>
      </header>

      {showAdd ? (
        <section className="add-project-panel">
          <label className="plain-field">
            <span>这台电脑上的项目文件夹</span>
            <span className="path-input"><input
              aria-label="这台电脑上的项目文件夹"
              onChange={(event) => setPath(event.target.value)}
              placeholder="例如：D:\Projects\Dragon\lens-mechanics"
              value={path}
            />{desktopDialogClient.available() ? <button aria-label="选择本地项目文件夹" onClick={() => void desktopDialogClient.chooseDirectory().then((selected) => { if (selected) setPath(selected) })} title="选择本地项目文件夹" type="button"><FolderOpen size={17} /></button> : null}</span>
          </label>
          <button
            className="button button--primary"
            disabled={!path.trim() || adding}
            onClick={() => {
              setAdding(true)
              setAddError(null)
              void onAdd(path)
                .then(() => {
                  setPath('')
                  setShowAdd(false)
                })
                .catch((cause) =>
                  setAddError(cause instanceof Error ? cause.message : '添加项目失败'),
                )
                .finally(() => setAdding(false))
            }}
            type="button"
          >
            {adding ? '正在验证' : '验证并添加'}
          </button>
          {addError ? <p className="add-project-error">{addError}</p> : null}
        </section>
      ) : null}

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
