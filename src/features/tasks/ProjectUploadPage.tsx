import { CheckCircle2, FileText, GitBranch, Plus, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { deliveryApi, type DeliveryApi } from '../../data/deliveryClient'
import type { RepositorySnapshot } from '../../domain/repository'
import { CreateBranchDialog } from '../delivery/CreateBranchDialog'
import { GuidedWorkflow } from './GuidedWorkflow'
import './wizardForms.css'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
const steps = ['选择分支', '核对文件', '填写标题', '确认上传']

export function ProjectUploadPage({ repository, api = deliveryApi, onRefresh }: Props) {
  const [step, setStep] = useState(0)
  const [branch, setBranch] = useState(repository.branch)
  const [branches, setBranches] = useState(repository.branches.map((item) => item.name))
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ commit: string; branch: string } | null>(null)
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const [startPoint, setStartPoint] = useState(repository.branch)

  async function createBranch() {
    setBusy(true); setError(null)
    try {
      const created = await api.createBranch({ name: newBranch.trim(), startPoint })
      setBranches((current) => [...new Set([...current, created.branch])])
      setBranch(created.branch); setShowCreateBranch(false); setNewBranch('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '创建分支失败') }
    finally { setBusy(false) }
  }

  async function upload() {
    setBusy(true); setError(null)
    try {
      const execution = await api.syncGitLab({
        message: title.trim(),
        changePaths: repository.changes.map((change) => change.path),
        confirmedDeletions: repository.changes.filter((change) => change.kind === 'deleted').map((change) => change.path),
        selectedPackageIds: [],
        branch,
      })
      setResult(execution); await onRefresh?.()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '上传到 GitLab 失败') }
    finally { setBusy(false) }
  }

  const nextDisabled = (step === 0 && !branch) || (step === 1 && !repository.changes.length) || (step === 2 && !title.trim()) || busy
  return (
    <>
      <GuidedWorkflow
        currentStep={step}
        description="把本地工程的有效改动保存并上传到 GitLab。"
        nextDisabled={nextDisabled}
        nextLabel={step === 3 ? (busy ? '正在上传' : '确认上传') : '下一步'}
        onBack={step > 0 && !result ? () => setStep((current) => current - 1) : undefined}
        onNext={result ? undefined : step === 3 ? () => void upload() : () => setStep((current) => current + 1)}
        steps={steps}
        title="上传整个工程"
      >
        {error ? <div className="delivery-alert delivery-alert--error">{error}</div> : null}
        {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>工程已上传</h2><p>已上传到 <strong>{result.branch}</strong>，保存编号为 <strong>{result.commit.slice(0, 8)}</strong>。</p></div> : null}
        {!result && step === 0 ? <div><Intro title="这次要上传到哪个分支？">分支可以理解为同一个项目的不同工作版本。</Intro><div className="choice-row"><label className="plain-field"><span>上传到</span><select aria-label="上传分支" onChange={(e) => setBranch(e.target.value)} value={branch}>{branches.map((item) => <option key={item}>{item}</option>)}</select></label><button aria-label="创建新分支" className="button button--secondary" onClick={() => { setStartPoint(branch); setShowCreateBranch(true) }} type="button"><Plus size={17} />新建分支</button></div></div> : null}
        {!result && step === 1 ? <div><Intro title="核对本次上传的文件">共 {repository.changes.length} 个新增、修改或删除的文件。</Intro><ul className="simple-file-list">{repository.changes.map((change) => <li key={change.id}><FileText size={16} /><span>{change.path}</span><small className={`file-status file-status--${change.kind}`}>{change.kind === 'untracked' ? '新增' : change.kind === 'modified' ? '已修改' : '已删除'}</small></li>)}</ul></div> : null}
        {!result && step === 2 ? <div><Intro title="给本次更新起一个标题">让同事一眼看懂你改了什么，例如“更新 T2 场旋框图纸”。</Intro><label className="plain-field"><span>本次更新标题</span><input aria-label="本次更新标题" autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="例如：更新 T2 场旋框图纸" value={title} /></label></div> : null}
        {!result && step === 3 ? <div><Intro title="确认上传">请核对下面的信息。点击确认后才会真正上传。</Intro><dl className="confirm-list"><div><dt><GitBranch size={16} />上传分支</dt><dd>{branch}</dd></div><div><dt><FileText size={16} />文件数量</dt><dd>{repository.changes.length} 个</dd></div><div><dt><UploadCloud size={16} />本次更新标题</dt><dd>{title}</dd></div></dl></div> : null}
      </GuidedWorkflow>
      {showCreateBranch ? <CreateBranchDialog branchName={newBranch} branches={branches} busy={busy} onBranchNameChange={setNewBranch} onCancel={() => setShowCreateBranch(false)} onConfirm={() => void createBranch()} onStartPointChange={setStartPoint} startPoint={startPoint} /> : null}
    </>
  )
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wizard-panel__intro"><h2>{title}</h2><p>{children}</p></div>
}
