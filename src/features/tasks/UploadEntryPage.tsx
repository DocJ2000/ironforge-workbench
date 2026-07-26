import { GitMerge, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RegisteredProject } from '../../data/repositoryContext'
import { GuidedWorkflow } from './GuidedWorkflow'
import './uploadEntry.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
}

export function UploadEntryPage({ projects, selectedId, onSelect }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<'gitlab' | 'ironforge' | null>(null)
  const selected = projects.find((project) => project.id === selectedId)
  return (
    <GuidedWorkflow
      currentStep={step}
      description="先确认本次操作的项目，再选择只保存工程，还是继续提交图纸审核。"
      nextDisabled={!selected || (step === 1 && !goal)}
      nextLabel={step === 1 ? '进入上传流程' : '下一步'}
      onBack={step > 0 ? () => setStep(0) : undefined}
      onNext={
        step === 0
          ? () => setStep(1)
          : goal
            ? () => navigate(`/workspace/upload/${goal}`)
            : undefined
      }
      steps={['选择项目', '选择上传目标']}
      title="上传项目"
    >
      {step === 0 ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>这次要上传哪个项目？</h2>
            <p>左侧当前项目只是默认值，你可以在这里为本次上传重新选择。</p>
          </div>
          <div className="workflow-project-list">
            {projects.map((project) => (
              <button
                aria-pressed={project.id === selectedId}
                className="workflow-project-choice"
                key={project.id}
                onClick={() => onSelect(project.id)}
                type="button"
              >
                <span>
                  <strong>{project.repository.displayName}</strong>
                  <small>{project.repository.path}</small>
                </span>
                <span>
                  {project.repository.branch}
                  {!project.connected ? ' · 尚未连接' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 1 ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>上传后还要提交图纸审核吗？</h2>
            <p>两种方式都会先把当前项目保存并上传到 GitLab。</p>
          </div>
          <div className="upload-goals">
            <button
              aria-pressed={goal === 'gitlab'}
              onClick={() => setGoal('gitlab')}
              type="button"
            >
              <UploadCloud size={23} />
              <span><strong>只保存工程到 GitLab</strong><small>保存工程进度，不创建审核单。</small></span>
            </button>
            <button
              aria-pressed={goal === 'ironforge'}
              onClick={() => setGoal('ironforge')}
              type="button"
            >
              <GitMerge size={23} />
              <span><strong>保存工程并提交图纸审核</strong><small>继续选择 OUTPUT 包、审核人并创建 MR。</small></span>
            </button>
          </div>
        </div>
      ) : null}
    </GuidedWorkflow>
  )
}
