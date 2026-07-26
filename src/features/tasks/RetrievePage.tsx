import { ArrowRight, Download, FolderDown, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { RepositorySnapshot } from '../../domain/repository'
import { GuidedWorkflow } from './GuidedWorkflow'
import './retrieve.css'

interface Props { repository: RepositorySnapshot }
const actions = [
  { id: 'clone', title: '把云端项目下载到这台电脑', description: '适合新电脑，或者本地还没有这个项目。', icon: FolderDown },
  { id: 'pull', title: '获取同事刚上传的改动', description: '本地已有项目，只把 GitLab 上的新内容更新下来。', icon: RefreshCw },
  { id: 'ironforge', title: '下载铁炉堡已发布图纸', description: '获取已经通过管理员审核的正式交付图纸。', icon: Download },
] as const
type ActionId = typeof actions[number]['id']

export function RetrievePage({ repository }: Props) {
  const [step, setStep] = useState(0)
  const [action, setAction] = useState<ActionId | null>(null)
  const [destination, setDestination] = useState(repository.path)
  const selected = actions.find((item) => item.id === action)
  return <GuidedWorkflow currentStep={step} description="先说明你要获取什么，再选择保存到这台电脑的哪个位置。" nextDisabled={step === 0 ? !action : !destination.trim()} nextLabel={step === 1 ? '确认位置' : '下一步'} onBack={step > 0 ? () => setStep(0) : undefined} onNext={step === 0 ? () => setStep(1) : undefined} steps={['选择要获取的内容', '选择保存位置']} title="获取项目和图纸">
    {step === 0 ? <div><div className="wizard-panel__intro"><h2>你要获取什么？</h2><p>请选择最符合当前情况的一项。</p></div><div className="retrieve-list">{actions.map(({ id, title, description, icon: Icon }) => <button aria-pressed={action === id} className="retrieve-choice" key={id} onClick={() => setAction(id)} type="button"><Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={18} /></button>)}</div></div> : null}
    {step === 1 && selected ? <div><div className="wizard-panel__intro"><h2>{selected.title}</h2><p>确认项目和本地位置。桌面版接入账号与项目中心后，会从这里执行下载。</p></div><dl className="confirm-list"><div><dt>当前项目</dt><dd>{repository.displayName}</dd></div><div><dt>云端项目</dt><dd>{repository.gitlabPath}</dd></div></dl><label className="plain-field spaced-field"><span>{action === 'pull' ? '更新这个本地文件夹' : '保存到这个文件夹'}</span><input aria-label="本地保存位置" onChange={(event) => setDestination(event.target.value)} value={destination} /></label></div> : null}
  </GuidedWorkflow>
}
