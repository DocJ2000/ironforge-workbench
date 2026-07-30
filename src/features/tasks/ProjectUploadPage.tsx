import { CheckCircle2, FileText, GitBranch, Plus, UploadCloud } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import { onboardingClient } from '../../data/onboardingClient'
import { notificationClient } from '../../data/notificationClient'
import { organizationClient } from '../../data/organizationClient'
import { uploadReceiptClient } from '../../data/uploadReceiptClient'
import { workflowDraftClient } from '../../data/workflowDraftClient'
import type { OutputPackageCandidate } from '../../domain/delivery'
import type { RepositorySnapshot } from '../../domain/repository'
import { FieldHelp } from '../account/FieldHelp'
import { PackageTree } from '../delivery/PackageTree'
import { GuidedWorkflow } from './GuidedWorkflow'
import {
  branchStartNames,
  initialUploadBranch,
  uploadBranchNames,
} from './uploadBranchRules'
import './wizardForms.css'
import './projectUpload.css'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
type ChangeFilter = 'untracked' | 'modified' | 'deleted'
const steps = ['确认项目', '核对修改', '选择交付包', '生成交付清单', '选择工作版本', '填写上传说明', '确认上传']

export function ProjectUploadPage({ repository, api = deliveryApi, onRefresh }: Props) {
  const branches = useMemo(() => uploadBranchNames(repository), [repository])
  const branchStarts = useMemo(() => branchStartNames(repository), [repository])
  const initialDraft = useMemo(
    () => workflowDraftClient.loadUpload(repository.id),
    [repository.id],
  )
  const [step, setStep] = useState(() => Math.min(initialDraft?.step ?? 0, steps.length - 1))
  const [branch, setBranch] = useState(() => {
    const saved = initialDraft?.branch
    return saved && branches.includes(saved) ? saved : initialUploadBranch(repository)
  })
  const [packages, setPackages] = useState<OutputPackageCandidate[]>([])
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set())
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReturnType<typeof friendlyErrorFrom> | null>(null)
  const [result, setResult] = useState<{ commit: string; branch: string } | null>(null)
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchStart, setNewBranchStart] = useState(
    () => branchStarts[0] ?? '',
  )
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>(() => {
    if (repository.changes.some((change) => change.kind === 'untracked')) return 'untracked'
    if (repository.changes.some((change) => change.kind === 'modified')) return 'modified'
    return 'deleted'
  })
  const selectableBranches = useMemo(
    () => branch && !branches.includes(branch) ? [...branches, branch] : branches,
    [branch, branches],
  )

  useEffect(() => {
    let active = true
    void api.overview().then((overview) => {
      if (!active) return
      setPackages(overview.packages)
      const availableIds = new Set(overview.packages.map((item) => item.id))
      const restoredIds = initialDraft?.selectedPackageIds.filter((id) => availableIds.has(id))
      setSelectedPackages(new Set(
        restoredIds?.length ? restoredIds : overview.packages.map((item) => item.id),
      ))
      setPackagesLoaded(true)
    }).catch((cause) => active && setError(friendlyErrorFrom(cause)))
    return () => { active = false }
  }, [api, initialDraft])

  useEffect(() => {
    if (!packagesLoaded || result) return
    workflowDraftClient.saveUpload(repository.id, {
      step,
      selectedPackageIds: [...selectedPackages],
      branch,
      title,
      description,
    })
  }, [
    branch,
    description,
    packagesLoaded,
    repository.id,
    result,
    selectedPackages,
    step,
    title,
  ])

  function togglePackage(id: string) {
    setSelectedPackages((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function upload() {
    setBusy(true); setError(null)
    try {
      const execution = await api.syncGitLab({
        message: title.trim(),
        description: description.trim(),
        changePaths: repository.changes.map((change) => change.path),
        confirmedDeletions: repository.changes.filter((change) => change.kind === 'deleted').map((change) => change.path),
        selectedPackageIds: [...selectedPackages],
        branch,
      })
      setResult(execution)
      workflowDraftClient.clearUpload(repository.id)
      uploadReceiptClient.save(repository.id, { branch: execution.branch, commit: execution.commit })
      onboardingClient.update({ firstUpload: true })
      void notificationClient.show('项目上传成功', '本次工程改动已经上传。')
      await onRefresh?.()
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setError(friendly)
      void notificationClient.show('项目上传失败', friendly.title)
    }
    finally { setBusy(false) }
  }

  async function retryPush(targetBranch = branch) {
    setBusy(true); setError(null)
    try {
      const execution = await api.retryPush(targetBranch)
      uploadReceiptClient.save(repository.id, execution)
      workflowDraftClient.clearUpload(repository.id)
      onboardingClient.update({ firstUpload: true })
      void notificationClient.show('项目上传成功', '本次工程改动已经上传。')
      await onRefresh?.()
      setResult(execution)
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setError(friendly)
      void notificationClient.show('重试上传失败', friendly.title)
    } finally { setBusy(false) }
  }

  async function createCloudBranch() {
    const suffix = newBranchName.trim().replace(/^dev\//i, '')
    if (!suffix) return
    setBusy(true); setError(null)
    try {
      const created = await api.createBranch({
        name: `dev/${suffix}`,
        startPoint: newBranchStart,
      })
      await onRefresh?.()
      setBranch(created.branch)
      setNewBranchName('')
      setShowCreateBranch(false)
    } catch (cause) {
      setError(friendlyErrorFrom(cause))
    } finally {
      setBusy(false)
    }
  }

  const selected = packages.filter((item) => selectedPackages.has(item.id))
  const nextDisabled =
    (step === 1 && !repository.changes.length)
    || (step === 2 && !selectedPackages.size)
    || (step === 4 && !branch)
    || (step === 5 && !title.trim())
    || busy
  const gitLabBase = organizationClient.load().gitlabUrl.replace(/\/+$/, '')
  const commitUrl = result && repository.gitlabPath
    ? `${gitLabBase}/${repository.gitlabPath}/-/commit/${result.commit}`
    : ''
  const hasPendingUpload = repository.ahead > 0 && repository.behind === 0

  const hasDiverged = repository.ahead > 0 && repository.behind > 0

  if (hasDiverged && !result) {
    return <section className="pending-upload">
      <span className="pending-upload__icon"><GitBranch size={30} /></span>
      <p className="task-eyebrow">需要先整理版本</p>
      <h1>电脑和云端都有新的内容</h1>
      <p>电脑里有 {repository.ahead} 次尚未上传的更新，云端也有 {repository.behind} 次尚未下载的更新。软件不会强行覆盖任何一边。</p>
      <div className="delivery-alert delivery-alert--warning">
        <strong>这时不能直接继续上传</strong>
        <p>请返回项目页面选择“下载云端的新内容”。如果同一份文件两边都改过，软件会保留现场并告诉你需要请技术同事处理。</p>
      </div>
      <Link className="button button--primary" to="/workspace">返回项目页面</Link>
    </section>
  }

  if (hasPendingUpload && !result) {
    return <section className="pending-upload">
      <span className="pending-upload__icon"><UploadCloud size={30} /></span>
      <p className="task-eyebrow">发现尚未完成的上传</p>
      <h1>有 {repository.ahead} 次更新还没有传到公司服务器</h1>
      <p>这是已经保存在电脑里的版本，不需要重新选择文件或再次创建更新。</p>
      <dl className="confirm-list pending-upload__details">
        <div><dt>更新标题</dt><dd>{repository.latestCommitMessage}</dd></div>
        <div><dt>保存编号</dt><dd>{repository.latestCommit.slice(0, 8)}</dd></div>
        <div><dt>工作版本</dt><dd>{repository.branch}</dd></div>
      </dl>
      {error ? <div className="delivery-alert delivery-alert--error">
        <strong>{error.title}</strong><p>{error.detail}</p><p>{error.nextAction}</p>
      </div> : null}
      <button
        className="button button--primary"
        disabled={busy}
        onClick={() => void retryPush(repository.branch)}
        type="button"
      >
        {busy ? '正在继续上传' : '继续上传'}
      </button>
    </section>
  }

  return <GuidedWorkflow
    currentStep={step}
    description="把这台电脑上的工程改动和交付清单一起上传到公司项目服务器（GitLab）。"
    nextDisabled={nextDisabled}
    nextLabel={step === 6 ? (busy ? '正在上传' : '确认上传') : '下一步'}
    onBack={step > 0 && !result ? () => setStep((current) => current - 1) : undefined}
    onExit={() => workflowDraftClient.clearUpload(repository.id)}
    onNext={result ? undefined : step === 6 ? () => void upload() : () => setStep((current) => current + 1)}
    steps={steps}
    title="上传整个工程"
  >
    {error ? <div className="delivery-alert delivery-alert--error"><strong>{error.title}</strong><p>{error.detail}</p><p>{error.nextAction}</p>{error.code === 'lfs_server_unavailable' ? <button className="button button--secondary" disabled={busy} onClick={() => void retryPush()} type="button">{busy ? '正在重试' : '只重试上传'}</button> : null}</div> : null}
    {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>工程已上传</h2><p>已上传到 <strong>{result.branch}</strong>，保存编号为 <strong>{result.commit.slice(0, 8)}</strong>。</p><div className="success-actions">{commitUrl ? <a className="button button--secondary" href={commitUrl} rel="noreferrer" target="_blank">查看本次上传</a> : null}<Link className="button button--primary" to="/workspace/upload/ironforge">继续提交铁炉堡审核</Link></div></div> : null}
    {!result && step === 0 ? <div><Intro title="确认本次上传的项目">后面的文件、交付包和工作版本都属于这个项目。</Intro><dl className="confirm-list"><div><dt>项目名称</dt><dd>{repository.displayName}</dd></div><div><dt>本机文件夹</dt><dd>{repository.path}</dd></div><div><dt>GitLab 项目</dt><dd>{repository.gitlabPath}</dd></div></dl></div> : null}
    {!result && step === 1 ? <ChangeReview changes={repository.changes} filter={changeFilter} onFilterChange={setChangeFilter} /> : null}
    {!result && step === 2 ? <div><Intro title="选择本次交付包">交付包是 <code>output</code> 文件夹里的第二级子文件夹。例如 <code>output/mechanical/机加件</code> 中，“机加件”才是一个交付包；<code>output</code>、<code>mechanical</code> 和里面的单个文件都不是。只需勾选需要交付的包，软件会把选择结果写入交付清单。</Intro>{packages.map((item) => <PackageTree changes={repository.changes} item={item} key={item.id} onToggle={() => togglePackage(item.id)} selected={selectedPackages.has(item.id)} />)}{!packages.length ? <p>OUTPUT 中没有找到可交付的第二级子文件夹。</p> : null}</div> : null}
    {!result && step === 3 ? <div><Intro title="核对自动生成的交付清单">上传时会在项目最外层自动创建或更新 <code>charge.json</code>。它支持 <code>output</code> 下任意分类文件夹，例如 <code>mechanical</code>、<code>electronics</code>；铁炉堡将按下面列出的完整路径读取交付包。</Intro><dl className="confirm-list">{selected.map((item) => <div key={item.id}><dt>{item.name}</dt><dd>{item.path}</dd></div>)}</dl></div> : null}
    {!result && step === 4 ? <div><Intro title="选择上传到哪个工作版本">这里只显示 GitLab 云端已有的开发分支。正式主分支 main 只能作为新版本的复制来源，不能直接上传。</Intro><div className="branch-picker-row"><label className="plain-field"><span className="field-label-row">本次工程阶段<FieldHelp label="本次工程阶段"><strong>选择 GitLab 页面中对应的开发分支。</strong><ol><li>T1、T2 代表不同工程阶段。</li><li>main 是正式主分支，不能直接上传。</li><li>如果列表为空，请点击右侧“新建工作版本”，并从 main 复制。</li></ol></FieldHelp></span><select aria-label="上传到哪个工作版本" disabled={!selectableBranches.length} onChange={(event) => setBranch(event.target.value)} value={branch}>{!selectableBranches.length ? <option value="">还没有工作版本，请先新建</option> : null}{selectableBranches.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button--secondary branch-action-button" onClick={() => setShowCreateBranch((current) => !current)} type="button"><Plus size={16} />新建工作版本</button></div>{showCreateBranch ? <div className="create-branch-panel"><h3>创建新的云端工作版本</h3><p>软件会先在 GitLab 创建成功，再把它选为本次上传目标。</p><div className="create-branch-fields"><label className="plain-field"><span>新工作版本名称</span><div className="branch-name-input"><span>dev/</span><input aria-label="新工作版本名称" onChange={(event) => setNewBranchName(event.target.value)} placeholder="例如：T1" value={newBranchName} /></div></label><label className="plain-field"><span>从哪个工作版本复制</span><select aria-label="从哪个工作版本复制" disabled={!branchStarts.length} onChange={(event) => setNewBranchStart(event.target.value)} value={newBranchStart}>{!branchStarts.length ? <option value="">没有找到云端版本</option> : null}{branchStarts.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="create-branch-actions"><button className="button button--secondary" onClick={() => setShowCreateBranch(false)} type="button">取消</button><button className="button button--primary" disabled={busy || !newBranchName.trim() || !newBranchStart} onClick={() => void createCloudBranch()} type="button">{busy ? '正在创建' : '创建到 GitLab'}</button></div></div> : null}{repository.branch !== branch ? <p className="change-review-note">本机当前是 {repository.branch}，本次将选择云端工作分支 {branch || '尚未创建'}。软件不会把本地临时分支显示成云端分支。</p> : null}</div> : null}
    {!result && step === 5 ? <div><Intro title="填写本次上传说明">标题用于快速识别，描述可补充更详细的变更内容。</Intro><label className="plain-field"><span>本次更新标题</span><input aria-label="本次更新标题" onChange={(event) => setTitle(event.target.value)} placeholder="例如：更新 T2 结构件图纸" value={title} /></label><label className="plain-field spaced-field"><span>本次更新描述（可以不填）</span><textarea aria-label="本次更新描述" onChange={(event) => setDescription(event.target.value)} placeholder="补充修改原因、影响范围或注意事项" rows={5} value={description} /></label></div> : null}
    {!result && step === 6 ? <div><Intro title="确认上传">点击确认后，软件才会生成 charge.json、保存本次改动并上传。</Intro><dl className="confirm-list"><div><dt>项目</dt><dd>{repository.displayName}</dd></div><div><dt><FileText size={16} />改动文件</dt><dd>{repository.changes.length} 个</dd></div><div><dt>交付包</dt><dd>{selectedPackages.size} 个</dd></div><div><dt><GitBranch size={16} />工作版本</dt><dd>{branch}</dd></div><div><dt><UploadCloud size={16} />更新标题</dt><dd>{title}</dd></div></dl></div> : null}
  </GuidedWorkflow>
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wizard-panel__intro"><h2>{title}</h2><p>{children}</p></div>
}

function ChangeReview({ changes, filter, onFilterChange }: {
  changes: RepositorySnapshot['changes']; filter: ChangeFilter; onFilterChange: (filter: ChangeFilter) => void
}) {
  const filters: Array<{ kind: ChangeFilter; label: string }> = [
    { kind: 'untracked', label: '新增' }, { kind: 'modified', label: '已修改' }, { kind: 'deleted', label: '已删除' },
  ]
  const visibleChanges = changes.filter((change) => change.kind === filter)
  return <div><Intro title="核对本次修改的文件">新增、修改和删除已经分开显示，不需要逐项确认。</Intro><div aria-label="文件变更分类" className="change-review-tabs" role="tablist">{filters.map(({ kind, label }) => <button aria-selected={filter === kind} className={`change-review-tab change-review-tab--${kind}`} key={kind} onClick={() => onFilterChange(kind)} role="tab" type="button"><span>{label}</span><strong>{changes.filter((change) => change.kind === kind).length}</strong></button>)}</div>{filter === 'deleted' ? <p className="change-review-note">这些文件会随本次上传从 GitLab 对应工作版本中移除，请整体浏览确认。</p> : null}<ul className="simple-file-list" role="tabpanel">{visibleChanges.map((change) => <li key={change.id}><FileText size={16} /><span>{change.path}</span><small className={`file-status file-status--${change.kind}`}>{filter === 'untracked' ? '新增' : filter === 'modified' ? '已修改' : '已删除'}</small></li>)}{!visibleChanges.length ? <li className="change-review-empty">这一类没有文件</li> : null}</ul></div>
}
