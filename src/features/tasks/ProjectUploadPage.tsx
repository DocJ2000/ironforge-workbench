import { CheckCircle2, FileText, GitBranch, Plus, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { deliveryApi, type DeliveryApi } from '../../data/deliveryClient'
import type { RepositorySnapshot } from '../../domain/repository'
import { CreateBranchDialog } from '../delivery/CreateBranchDialog'
import { GuidedWorkflow } from './GuidedWorkflow'
import './wizardForms.css'
import './projectUpload.css'
import { onboardingClient } from '../../data/onboardingClient'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
const steps = ['确认项目', '选择工作版本', '核对文件', '填写标题', '安全检查', '确认上传']

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
    } catch (cause) { setError(cause instanceof Error ? cause.message : '创建工作版本失败') }
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
      onboardingClient.update({ firstUpload: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '上传到 GitLab 失败') }
    finally { setBusy(false) }
  }

  const nextDisabled = (step === 1 && !branch) || (step === 2 && !repository.changes.length) || (step === 3 && !title.trim()) || (step === 4 && (repository.behind > 0 || branch !== repository.branch)) || busy
  return (
    <>
      <GuidedWorkflow
        currentStep={step}
        description="把这台电脑上的工程改动上传到公司项目服务器（GitLab）。"
        nextDisabled={nextDisabled}
        nextLabel={step === 5 ? (busy ? '正在上传' : '确认上传') : '下一步'}
        onBack={step > 0 && !result ? () => setStep((current) => current - 1) : undefined}
        onNext={result ? undefined : step === 5 ? () => void upload() : () => setStep((current) => current + 1)}
        steps={steps}
        title="上传整个工程"
      >
        {error ? <div className="delivery-alert delivery-alert--error">{error}</div> : null}
        {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>工程已上传</h2><p>已上传到工作版本 <strong>{result.branch}</strong>，保存编号为 <strong>{result.commit.slice(0, 8)}</strong>。</p></div> : null}
        {!result && step === 0 ? <div><Intro title="确认本次上传的项目">后续选择的工作版本和文件都属于这个项目。</Intro><dl className="confirm-list"><div><dt>项目名称</dt><dd>{repository.displayName}</dd></div><div><dt>这台电脑上的文件夹</dt><dd>{repository.path}</dd></div><div><dt>公司服务器上的项目</dt><dd>{repository.gitlabPath}</dd></div></dl></div> : null}
        {!result && step === 1 ? <div><Intro title="这次要上传到哪个工作版本？">工作版本用于隔开不同阶段的修改，例如 T1 和 T2。</Intro><div className="choice-row"><label className="plain-field"><span>工作版本</span><select aria-label="上传到哪个工作版本" onChange={(e) => setBranch(e.target.value)} value={branch}>{branches.map((item) => <option key={item}>{item}</option>)}</select></label><button aria-label="创建新工作版本" className="button button--secondary branch-action-button" onClick={() => { setStartPoint(branch); setShowCreateBranch(true) }} type="button"><Plus size={17} />新建工作版本</button></div></div> : null}
        {!result && step === 2 ? <div><Intro title="核对本次上传的文件">共 {repository.changes.length} 个新增、修改或删除的文件。</Intro><ul className="simple-file-list">{repository.changes.map((change) => <li key={change.id}><FileText size={16} /><span>{change.path}</span><small className={`file-status file-status--${change.kind}`}>{change.kind === 'untracked' ? '新增' : change.kind === 'modified' ? '已修改' : '已删除'}</small></li>)}</ul></div> : null}
        {!result && step === 3 ? <div><Intro title="给本次更新起一个标题">让同事一眼看懂你改了什么，例如“更新 T2 场旋框图纸”。</Intro><label className="plain-field"><span>本次更新标题</span><input aria-label="本次更新标题" autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="例如：更新 T2 场旋框图纸" value={title} /></label></div> : null}
        {!result && step === 4 ? <div><Intro title="上传前安全检查">这里只检查，不会改动文件。</Intro><dl className="confirm-list"><div><dt>本地文件</dt><dd>{repository.changes.length ? '有内容需要上传' : '没有改动'}</dd></div><div><dt>公司服务器</dt><dd>{repository.behind ? `有 ${repository.behind} 个新版本，请先获取` : '没有待获取的新版本'}</dd></div><div><dt>工作版本</dt><dd>{branch === repository.branch ? '选择正确' : '与当前版本不一致'}</dd></div></dl></div> : null}
        {!result && step === 5 ? <div><Intro title="确认上传">请核对下面的信息。点击确认后才会真正上传。</Intro><dl className="confirm-list"><div><dt>本次操作项目</dt><dd>{repository.displayName}</dd></div><div><dt>这台电脑上的文件夹</dt><dd>{repository.path}</dd></div><div><dt><GitBranch size={16} />工作版本</dt><dd>{branch}</dd></div><div><dt><FileText size={16} />文件数量</dt><dd>{repository.changes.length} 个</dd></div><div><dt><UploadCloud size={16} />本次更新标题</dt><dd>{title}</dd></div></dl></div> : null}
      </GuidedWorkflow>
      {showCreateBranch ? <CreateBranchDialog branchName={newBranch} branches={branches} busy={busy} onBranchNameChange={setNewBranch} onCancel={() => setShowCreateBranch(false)} onConfirm={() => void createBranch()} onStartPointChange={setStartPoint} startPoint={startPoint} /> : null}
    </>
  )
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wizard-panel__intro"><h2>{title}</h2><p>{children}</p></div>
}
