import { CheckCircle2, FileText, GitBranch, Plus, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deliveryApi, type DeliveryApi } from '../../data/deliveryClient'
import type { RepositorySnapshot } from '../../domain/repository'
import { CreateBranchDialog } from '../delivery/CreateBranchDialog'
import { GuidedWorkflow } from './GuidedWorkflow'
import './wizardForms.css'
import './projectUpload.css'
import { onboardingClient } from '../../data/onboardingClient'
import { FieldHelp } from '../account/FieldHelp'
import { uploadReceiptClient } from '../../data/uploadReceiptClient'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
type ChangeFilter = 'untracked' | 'modified' | 'deleted'
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
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>(() => {
    if (repository.changes.some((change) => change.kind === 'untracked')) return 'untracked'
    if (repository.changes.some((change) => change.kind === 'modified')) return 'modified'
    return 'deleted'
  })

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
      uploadReceiptClient.save(repository.id, { branch: execution.branch, commit: execution.commit })
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
        {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>工程已上传</h2><p>已上传到工作版本 <strong>{result.branch}</strong>，保存编号为 <strong>{result.commit.slice(0, 8)}</strong>。</p><Link className="button button--primary" to="/workspace/upload/ironforge">继续提交图纸审核</Link><Link className="button button--secondary" to="/workspace/project">返回项目操作</Link></div> : null}
        {!result && step === 0 ? <div><Intro title="确认本次上传的项目">后续选择的工作版本和文件都属于这个项目。</Intro><dl className="confirm-list"><div><dt>项目名称</dt><dd>{repository.displayName}</dd></div><div><dt>这台电脑上的文件夹</dt><dd>{repository.path}</dd></div><div><dt>公司服务器上的项目</dt><dd>{repository.gitlabPath}</dd></div></dl></div> : null}
        {!result && step === 1 ? <div><Intro title="这次属于哪个工程阶段？">软件已自动选择当前阶段，通常不用修改。</Intro><div className="choice-row"><label className="plain-field"><span className="field-label-row">本次工程阶段<FieldHelp label="本次工程阶段"><strong>通常保持软件自动选择的内容即可。</strong><ol><li>T1、T2 代表项目的不同阶段。</li><li>如果本次工作属于当前阶段，不要修改。</li><li>只有负责人明确要求换阶段时才选择其他项。</li><li>不确定时停止操作并询问项目负责人，不要新建。</li></ol></FieldHelp></span><select aria-label="上传到哪个工作版本" onChange={(e) => setBranch(e.target.value)} value={branch}>{branches.map((item) => <option key={item}>{item}</option>)}</select></label><button aria-label="创建新工作版本" className="button button--secondary branch-action-button" onClick={() => { setStartPoint(branch); setShowCreateBranch(true) }} type="button"><Plus size={17} />新建工作版本</button></div></div> : null}
        {!result && step === 2 ? <ChangeReview changes={repository.changes} filter={changeFilter} onFilterChange={setChangeFilter} /> : null}
        {!result && step === 3 ? <div><Intro title="用一句话说明这次做了什么">这句话会帮助同事以后找到本次记录。</Intro><label className="plain-field"><span className="field-label-row">这次做了什么<FieldHelp label="更新标题"><strong>不需要使用专业格式。</strong><ol><li>先写动作，例如“新增”“修改”或“删除”。</li><li>再写零件或资料名称。</li><li>需要时补充阶段，例如 T2。</li><li>正确示例：“修改 T2 示例零件图纸”。</li><li>不要只写“更新”“改了一下”或日期。</li></ol></FieldHelp></span><input aria-label="本次更新标题" autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="例如：修改 T2 示例零件图纸" value={title} /></label></div> : null}
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

function ChangeReview({ changes, filter, onFilterChange }: {
  changes: RepositorySnapshot['changes']
  filter: ChangeFilter
  onFilterChange: (filter: ChangeFilter) => void
}) {
  const filters: Array<{ kind: ChangeFilter; label: string }> = [
    { kind: 'untracked', label: '新增' },
    { kind: 'modified', label: '已修改' },
    { kind: 'deleted', label: '已删除' },
  ]
  const visibleChanges = changes.filter((change) => change.kind === filter)

  return <div>
    <Intro title="核对本次上传的文件">本次共变更 {changes.length} 个文件，请分开查看新增、修改和删除的内容。</Intro>
    <div aria-label="文件变更分类" className="change-review-tabs" role="tablist">
      {filters.map(({ kind, label }) => {
        const count = changes.filter((change) => change.kind === kind).length
        return <button
          aria-controls={`change-panel-${kind}`}
          aria-selected={filter === kind}
          className={`change-review-tab change-review-tab--${kind}`}
          key={kind}
          onClick={() => onFilterChange(kind)}
          role="tab"
          type="button"
        >
          <span>{label}</span><strong>{count}</strong>
        </button>
      })}
    </div>
    {filter === 'deleted' ? <p className="change-review-note">这些文件上传后会从公司服务器中移除，请确认它们确实不再需要。</p> : null}
    <div aria-live="polite" className="change-review-summary">
      当前显示：{filters.find((item) => item.kind === filter)?.label} {visibleChanges.length} 个
    </div>
    <ul className="simple-file-list" id={`change-panel-${filter}`} role="tabpanel">
      {visibleChanges.map((change) => <li key={change.id}><FileText size={16} /><span>{change.path}</span><small className={`file-status file-status--${change.kind}`}>{change.kind === 'untracked' ? '新增' : change.kind === 'modified' ? '已修改' : '已删除'}</small></li>)}
      {!visibleChanges.length ? <li className="change-review-empty">这一类没有文件</li> : null}
    </ul>
  </div>
}
