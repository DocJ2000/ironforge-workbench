import { ArrowRight, Download, FolderDown, FolderOpen, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { RegisteredProject } from '../../data/repositoryContext'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import type { FriendlyError } from '../../domain/connection'
import { FriendlyErrorNotice } from '../errors/FriendlyErrorNotice'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import { GuidedWorkflow } from './GuidedWorkflow'
import './retrieve.css'
import './ironforgeLink.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
  api?: DeliveryApi
  onRefresh?: () => Promise<void>
}
const actions = [
  { id: 'clone', title: '把云端项目下载到这台电脑', description: '适合新电脑，或者本地还没有这个项目。', icon: FolderDown },
  { id: 'pull', title: '获取同事刚上传的改动', description: '本地已有项目，只把公司项目服务器上的新内容更新下来。', icon: RefreshCw },
  { id: 'ironforge', title: '下载铁炉堡已发布图纸', description: '获取已经通过管理员审核的正式交付图纸。', icon: Download },
] as const
type ActionId = typeof actions[number]['id']

export function RetrievePage({
  projects,
  selectedId,
  onSelect,
  api = deliveryApi,
  onRefresh,
}: Props) {
  const [step, setStep] = useState(0)
  const [action, setAction] = useState<ActionId | null>(null)
  const selectedProject = projects.find((project) => project.id === selectedId)
  const [destination, setDestination] = useState(
    selectedProject?.repository.path ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [pullResult, setPullResult] = useState<{
    updated: boolean
    receivedCommits: number
  } | null>(null)
  const [cloneResult, setCloneResult] = useState<string | null>(null)
  const [remoteUrl, setRemoteUrl] = useState('')
  const selectedAction = actions.find((item) => item.id === action)

  function selectProject(id: string) {
    onSelect(id)
    const project = projects.find((item) => item.id === id)
    if (project) setDestination(project.repository.path)
  }

  async function retrieve() {
    if (action !== 'pull' && action !== 'clone') return
    setBusy(true)
    setError(null)
    try {
      if (action === 'pull') {
        setPullResult(await api.pull())
      } else {
        const result = await api.clone({
          remoteUrl,
          destination,
        })
        setCloneResult(result.project.path)
      }
      await onRefresh?.()
    } catch (cause) {
      setError(friendlyErrorFrom(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <GuidedWorkflow
      currentStep={step}
      description="每次获取都先单独确认项目，再选择内容和保存位置。"
      nextDisabled={
        (step === 0 && !selectedProject) ||
        (step === 1 && !action) ||
        (step === 2 && (!destination.trim() || (action === 'clone' && !remoteUrl.trim()))) ||
        busy
      }
      nextLabel={step === 2 && (action === 'pull' || action === 'clone') ? busy ? '正在处理' : action === 'pull' ? '确认获取' : '确认下载' : step === 2 ? '确认位置' : '下一步'}
      onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
      onNext={step < 2 ? () => setStep((current) => current + 1) : (action === 'pull' && !pullResult) || (action === 'clone' && !cloneResult) ? () => void retrieve() : undefined}
      steps={['选择项目', '选择要获取的内容', '选择保存位置']}
      title="获取项目和图纸"
    >
      {step === 0 ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>这次要获取哪个项目？</h2>
            <p>这里的选择只影响本次获取操作。</p>
          </div>
          <div className="workflow-project-list">
            {projects.map((project) => (
              <button
                aria-pressed={project.id === selectedId}
                className="workflow-project-choice"
                key={project.id}
                onClick={() => selectProject(project.id)}
                type="button"
              >
                <span><strong>{project.repository.displayName}</strong><small>{project.repository.path}</small></span>
                <span>{project.repository.branch}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 1 ? (
        <div>
          <div className="wizard-panel__intro"><h2>你要获取什么？</h2><p>请选择最符合当前情况的一项。</p></div>
          <div className="retrieve-list">
            {actions.map(({ id, title, description, icon: Icon }) => (
              <button aria-pressed={action === id} className="retrieve-choice" key={id} onClick={() => { setAction(id); if (id === 'clone') setDestination('') }} type="button">
                <Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={18} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 2 && selectedAction && selectedProject ? (
        <div>
          {error ? <FriendlyErrorNotice error={error} /> : null}
          {pullResult ? (
            <div className="wizard-success">
              <h2>{pullResult.updated ? '已获取同事上传的改动' : '本地已经是最新版本'}</h2>
              <p>{pullResult.updated ? `本次获取了 ${pullResult.receivedCommits} 个新版本。` : '公司项目服务器没有比这台电脑更新的内容。'}</p>
            </div>
          ) : null}
          {cloneResult ? <div className="wizard-success"><h2>云端项目已下载</h2><p>已保存到 {cloneResult}，并加入项目列表。</p></div> : null}
          {!pullResult && !cloneResult ? <>
          <div className="wizard-panel__intro">
            <h2>{selectedAction.title}</h2>
            <p>确认项目和本地位置。</p>
          </div>
          <dl className="confirm-list">
            <div><dt>本次操作项目</dt><dd>{selectedProject.repository.displayName}</dd></div>
            {action !== 'clone' ? <div><dt>公司服务器上的项目</dt><dd>{selectedProject.repository.gitlabPath}</dd></div> : null}
          </dl>
          {action === 'clone' ? <>
            <label className="plain-field spaced-field"><span>管理员提供的项目下载地址</span><input aria-label="管理员提供的项目下载地址" onChange={(event) => setRemoteUrl(event.target.value)} placeholder="粘贴管理员发给你的地址" value={remoteUrl} /></label>
          </> : null}
          <label className="plain-field spaced-field">
            <span>{action === 'pull' ? '更新这个本地文件夹' : '保存到这个文件夹'}</span>
            <span className={action === 'clone' && desktopDialogClient.available() ? 'path-input' : undefined}><input aria-label="本地保存位置" onChange={(event) => setDestination(event.target.value)} readOnly={action === 'pull'} value={destination} />{action === 'clone' && desktopDialogClient.available() ? <button aria-label="选择本地保存位置" onClick={() => void desktopDialogClient.chooseDirectory().then((path) => { if (path) setDestination(path) })} title="选择本地保存位置" type="button"><FolderOpen size={17} /></button> : null}</span>
          </label>
          {action === 'ironforge' ? (
            <a className="button button--secondary ironforge-link" href="http://ironforge.holo.tp/projects" rel="noreferrer" target="_blank">
              打开铁炉堡项目
            </a>
          ) : null}
          </> : null}
        </div>
      ) : null}
    </GuidedWorkflow>
  )
}
