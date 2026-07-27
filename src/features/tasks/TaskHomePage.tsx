import { FolderOpen, FolderPlus, GitBranch, HardDrive } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RegisteredProject } from '../../data/repositoryContext'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import { summarizeRepository } from '../../domain/repository'
import { FieldHelp } from '../account/FieldHelp'
import './tasks.css'
import './projectCenter.css'
import './projectCommands.css'
import './addProject.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (path: string) => Promise<void>
}

export function TaskHomePage({ projects, onSelect, onAdd }: Props) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [path, setPath] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  function openProject(id: string) {
    onSelect(id)
    navigate('/workspace/project')
  }

  return (
    <div className="task-page project-center">
      <header className="project-center__header">
        <div>
          <span className="task-eyebrow">GitLab</span>
          <h1>选择一个项目</h1>
          <p>点击项目后，再选择上传、下载或查看历史。</p>
        </div>
        <div className="project-center__commands">
          <button className="button button--secondary" onClick={() => setShowAdd((value) => !value)} type="button">
            <FolderPlus size={17} />
            添加本机项目
          </button>
          <Link className="button button--secondary" to="/workspace/download-new">下载新项目</Link>
        </div>
      </header>

      {showAdd ? (
        <section className="add-project-panel">
          <label className="plain-field">
            <span className="field-label-row">项目文件夹
              <FieldHelp label="项目文件夹">
                <strong>请选择整个项目最外层的文件夹。</strong>
                <p>软件只登记位置，不会移动、删除或上传文件。选择项目后，仍需明确点击上传。</p>
              </FieldHelp>
            </span>
            <span className="path-input">
              <input aria-label="这台电脑上的项目文件夹" onChange={(event) => setPath(event.target.value)} placeholder="选择项目所在的文件夹" value={path} />
              {desktopDialogClient.available() ? <button aria-label="选择本地项目文件夹" onClick={() => void desktopDialogClient.chooseDirectory().then((selected) => { if (selected) setPath(selected) })} title="选择文件夹" type="button"><FolderOpen size={17} /></button> : null}
            </span>
          </label>
          <button className="button button--primary" disabled={!path.trim() || adding} onClick={() => {
            setAdding(true)
            setAddError(null)
            void onAdd(path).then(() => { setPath(''); setShowAdd(false) }).catch((cause) => setAddError(cause instanceof Error ? cause.message : '添加项目失败')).finally(() => setAdding(false))
          }} type="button">{adding ? '正在检查' : '添加这个项目'}</button>
          {addError ? <p className="add-project-error">{addError}</p> : null}
        </section>
      ) : null}

      <div className="project-list">
        {projects.map((project) => {
          const summary = summarizeRepository(project.repository)
          return (
            <button className="project-row" key={project.id} onClick={() => openProject(project.id)} type="button">
              <span className="project-row__identity">
                <span className="project-row__icon"><HardDrive size={20} /></span>
                <span><strong>{project.repository.displayName}</strong><small>{project.repository.path}</small></span>
              </span>
              <span className="project-row__facts">
                <span><GitBranch size={14} />{project.repository.branch}</span>
                <span>{project.repository.changes.length} 个本机修改</span>
                <span className={`project-state project-state--${summary.syncTone}`}>{summary.syncLabel}</span>
              </span>
              <span className="project-row__open">选择项目</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
