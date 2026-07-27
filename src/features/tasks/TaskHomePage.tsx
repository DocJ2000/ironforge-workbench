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
import './projectEmpty.css'

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

  const projectActions = (
    <>
      <button className="button button--secondary" onClick={() => setShowAdd((value) => !value)} type="button">
        <FolderPlus size={17} />
        找到本机已有项目
      </button>
      <Link className="button button--secondary" to="/workspace/download-new">下载新项目</Link>
    </>
  )

  return (
    <div className={`task-page project-center${projects.length === 0 ? ' project-center--empty' : ''}`}>
      <header className="project-center__header">
        <div>
          <span className="task-eyebrow">GitLab</span>
          <h1>选择一个项目</h1>
          <p>点击项目后，再选择上传、下载或查看历史。</p>
        </div>
        {projects.length > 0 ? <div className="project-center__commands">{projectActions}</div> : null}
      </header>

      {projects.length === 0 ? (
        <section className="project-center__empty-actions">
          <h2>这台电脑还没有项目</h2>
          <p>选择一种方式，把第一个项目放进来。</p>
          <div>{projectActions}</div>
        </section>
      ) : null}

      {showAdd ? (
        <section className="add-project-panel">
          <label className="plain-field">
            <span className="field-label-row">本机已有项目的文件夹
              <FieldHelp label="项目文件夹">
                <strong>这里只适合以前已经在这台电脑上使用过的 GitLab 项目。</strong>
                <ol>
                  <li>如果项目是从公司服务器下载过的，选择整个项目最外层文件夹。</li>
                  <li>如果是新电脑，或者项目还不在这台电脑上，请返回并点击“下载新项目”。</li>
                  <li>普通文件夹不能直接添加；软件不会偷偷把普通文件夹上传到公司。</li>
                  <li>添加只会记住位置，不会移动、删除或上传任何文件。</li>
                </ol>
              </FieldHelp>
            </span>
            <span className="path-input">
              <input aria-label="这台电脑上的项目文件夹" onChange={(event) => setPath(event.target.value)} placeholder="选择以前使用过的项目文件夹" value={path} />
              {desktopDialogClient.available() ? <button aria-label="选择本地项目文件夹" onClick={() => void desktopDialogClient.chooseDirectory().then((selected) => { if (selected) setPath(selected) })} title="选择文件夹" type="button"><FolderOpen size={17} /></button> : null}
            </span>
          </label>
          <button className="button button--primary" disabled={!path.trim() || adding} onClick={() => {
            setAdding(true)
            setAddError(null)
            void onAdd(path).then(() => { setPath(''); setShowAdd(false) }).catch((cause) => setAddError(cause instanceof Error ? cause.message : '添加项目失败')).finally(() => setAdding(false))
          }} type="button">{adding ? '正在检查' : '确认这是已有项目'}</button>
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
