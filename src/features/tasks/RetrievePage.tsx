import { ArrowRight, Download, FolderDown, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { RegisteredProject } from '../../data/repositoryContext'
import { GuidedWorkflow } from './GuidedWorkflow'
import './retrieve.css'
import './ironforgeLink.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
}
const actions = [
  { id: 'clone', title: '把云端项目下载到这台电脑', description: '适合新电脑，或者本地还没有这个项目。', icon: FolderDown },
  { id: 'pull', title: '获取同事刚上传的改动', description: '本地已有项目，只把 GitLab 上的新内容更新下来。', icon: RefreshCw },
  { id: 'ironforge', title: '下载铁炉堡已发布图纸', description: '获取已经通过管理员审核的正式交付图纸。', icon: Download },
] as const
type ActionId = typeof actions[number]['id']

export function RetrievePage({ projects, selectedId, onSelect }: Props) {
  const [step, setStep] = useState(0)
  const [action, setAction] = useState<ActionId | null>(null)
  const selectedProject = projects.find((project) => project.id === selectedId)
  const [destination, setDestination] = useState(
    selectedProject?.repository.path ?? '',
  )
  const selectedAction = actions.find((item) => item.id === action)

  function selectProject(id: string) {
    onSelect(id)
    const project = projects.find((item) => item.id === id)
    if (project) setDestination(project.repository.path)
  }

  return (
    <GuidedWorkflow
      currentStep={step}
      description="每次获取都先单独确认项目，再选择内容和保存位置。"
      nextDisabled={
        (step === 0 && !selectedProject) ||
        (step === 1 && !action) ||
        (step === 2 && !destination.trim())
      }
      nextLabel={step === 2 ? '确认位置' : '下一步'}
      onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
      onNext={step < 2 ? () => setStep((current) => current + 1) : undefined}
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
              <button aria-pressed={action === id} className="retrieve-choice" key={id} onClick={() => setAction(id)} type="button">
                <Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={18} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 2 && selectedAction && selectedProject ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>{selectedAction.title}</h2>
            <p>确认项目和本地位置。</p>
          </div>
          <dl className="confirm-list">
            <div><dt>本次操作项目</dt><dd>{selectedProject.repository.displayName}</dd></div>
            <div><dt>云端项目</dt><dd>{selectedProject.repository.gitlabPath}</dd></div>
          </dl>
          <label className="plain-field spaced-field">
            <span>{action === 'pull' ? '更新这个本地文件夹' : '保存到这个文件夹'}</span>
            <input aria-label="本地保存位置" onChange={(event) => setDestination(event.target.value)} value={destination} />
          </label>
          {action === 'ironforge' ? (
            <a className="button button--secondary ironforge-link" href="http://ironforge.holo.tp/projects" rel="noreferrer" target="_blank">
              打开铁炉堡项目
            </a>
          ) : null}
        </div>
      ) : null}
    </GuidedWorkflow>
  )
}
