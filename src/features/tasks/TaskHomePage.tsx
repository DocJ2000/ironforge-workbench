import {
  ExternalLink,
  FolderOpen,
  FolderPlus,
  GitBranch,
  HardDrive,
  LogIn,
  PanelTopOpen,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RegisteredProject } from '../../data/repositoryContext'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import { organizationClient } from '../../data/organizationClient'
import { ironforgeWindowClient } from '../../data/ironforgeWindowClient'
import { summarizeRepository } from '../../domain/repository'
import { FieldHelp } from '../account/FieldHelp'
import './tasks.css'
import './projectCenter.css'
import './addProject.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (path: string) => Promise<void>
}

export function TaskHomePage({ projects, onSelect, onAdd }: Props) {
  const navigate = useNavigate()
  const [area, setArea] = useState<'gitlab' | 'ironforge'>('gitlab')
  const [showAdd, setShowAdd] = useState(false)
  const [path, setPath] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const ironforgeUrl = organizationClient.load().ironforgeUrl

  function openProject(id: string) {
    onSelect(id)
    navigate('/workspace/project')
  }

  return (
    <div className="task-page project-center">
      <header className="project-center__header">
        <div>
          <span className="task-eyebrow">项目</span>
          <h1>你想去哪里？</h1>
          <p>GitLab 用来保存工程，铁炉堡用来查看正式发布的图纸。</p>
        </div>
      </header>

      <div aria-label="项目区域" className="project-area-tabs" role="tablist">
        <button aria-selected={area === 'gitlab'} onClick={() => setArea('gitlab')} role="tab" type="button">
          <HardDrive size={20} />
          <span><strong>GitLab</strong><small>上传或下载工程</small></span>
        </button>
        <button aria-selected={area === 'ironforge'} onClick={() => setArea('ironforge')} role="tab" type="button">
          <span className="project-area-tabs__if">IF</span>
          <span><strong>铁炉堡</strong><small>查看正式图纸</small></span>
        </button>
      </div>

      {area === 'gitlab' ? (
        <section aria-label="GitLab 项目" className="project-area-panel" role="tabpanel">
          <div className="project-area-panel__heading">
            <div><h2>选择一个项目</h2><p>点击项目后，再选择上传或下载。</p></div>
            <button className="button button--secondary" onClick={() => setShowAdd((value) => !value)} type="button">
              <FolderPlus size={17} />
              添加项目
            </button>
          </div>

          {showAdd ? (
            <div className="add-project-panel">
              <label className="plain-field">
                <span className="field-label-row">项目文件夹
                  <FieldHelp label="项目文件夹">
                    <strong>请选择整个项目最外层的文件夹。</strong>
                    <p>软件只登记位置，不会移动、删除或上传文件。选择后还要进入项目并明确点击上传。</p>
                  </FieldHelp>
                </span>
                <span className="path-input"><input aria-label="这台电脑上的项目文件夹" onChange={(event) => setPath(event.target.value)} placeholder="选择项目所在的文件夹" value={path} />{desktopDialogClient.available() ? <button aria-label="选择本地项目文件夹" onClick={() => void desktopDialogClient.chooseDirectory().then((selected) => { if (selected) setPath(selected) })} title="选择文件夹" type="button"><FolderOpen size={17} /></button> : null}</span>
              </label>
              <button className="button button--primary" disabled={!path.trim() || adding} onClick={() => {
                setAdding(true)
                setAddError(null)
                void onAdd(path).then(() => { setPath(''); setShowAdd(false) }).catch((cause) => setAddError(cause instanceof Error ? cause.message : '添加项目失败')).finally(() => setAdding(false))
              }} type="button">{adding ? '正在检查' : '添加这个项目'}</button>
              {addError ? <p className="add-project-error">{addError}</p> : null}
            </div>
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
                  <span className="project-row__open">打开项目</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <section aria-label="铁炉堡" className="project-area-panel ironforge-entry" role="tabpanel">
          <span className="ironforge-entry__mark">IF</span>
          <div><h2>铁炉堡单独登录</h2><p>铁炉堡和 GitLab 的权限不同。这里始终使用铁炉堡官方登录页面，软件不会拿走或保存你的登录信息。</p></div>
          <div className="ironforge-entry__choices">
            <button className="button button--primary" disabled={!ironforgeUrl} onClick={() => void ironforgeWindowClient.open(ironforgeUrl)} type="button">
              <PanelTopOpen size={17} />
              在软件内打开
            </button>
            {ironforgeUrl ? (
              <a className="button button--secondary" href={ironforgeUrl} rel="noreferrer" target="_blank">
                <ExternalLink size={17} />
                使用浏览器打开
              </a>
            ) : (
              <button className="button button--secondary" disabled type="button">
                <ExternalLink size={17} />
                使用浏览器打开
              </button>
            )}
          </div>
          {!ironforgeUrl ? <p className="ironforge-entry__missing"><LogIn size={16} />请先在“设置”中填写铁炉堡地址。</p> : null}
        </section>
      )}
    </div>
  )
}
