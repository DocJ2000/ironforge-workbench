import { CheckCircle2, PackageCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { deliveryApi, type DeliveryApi } from '../../data/deliveryClient'
import type { GitLabReviewer, OutputPackageCandidate } from '../../domain/delivery'
import type { RepositorySnapshot } from '../../domain/repository'
import { MergeRequestEditor } from '../delivery/MergeRequestEditor'
import { PackageTree } from '../delivery/PackageTree'
import { ReviewerSelector } from '../delivery/ReviewerSelector'
import { GuidedWorkflow } from './GuidedWorkflow'
import './ironforgeDelivery.css'
import './deliverySuccess.css'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
const steps = ['选择交付图纸', '填写更新', '上传图纸', '填写交付', '选择审核人', '提交审核']

export function IronforgeDeliveryPage({ repository, api = deliveryApi, onRefresh }: Props) {
  const [step, setStep] = useState(0)
  const [packages, setPackages] = useState<OutputPackageCandidate[]>([])
  const [reviewers, setReviewers] = useState<GitLabReviewer[]>([])
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set())
  const [selectedReviewers, setSelectedReviewers] = useState<Set<number>>(new Set())
  const [updateTitle, setUpdateTitle] = useState('')
  const [tag, setTag] = useState('')
  const [deliveryTitle, setDeliveryTitle] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [syncResult, setSyncResult] = useState<{ commit: string; branch: string } | null>(null)
  const [mrResult, setMrResult] = useState<{ iid: number; webUrl: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void api.overview().then((result) => {
      if (!active) return
      setPackages(result.packages)
      setReviewers(result.reviewers)
      setSelectedPackages(new Set(result.packages.map((item) => item.id)))
    }).catch((cause) => active && setError(cause instanceof Error ? cause.message : '读取交付包失败'))
    return () => { active = false }
  }, [api])

  function togglePackage(id: string) {
    setSelectedPackages((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleReviewer(id: number) {
    setSelectedReviewers((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function sync() {
    setBusy(true); setError(null)
    try {
      const result = await api.syncGitLab({
        message: updateTitle.trim(),
        changePaths: repository.changes.map((change) => change.path),
        confirmedDeletions: repository.changes.filter((change) => change.kind === 'deleted').map((change) => change.path),
        selectedPackageIds: [...selectedPackages],
        branch: repository.branch,
        ...(tag.trim() ? { tag: { name: tag.trim(), message: updateTitle.trim() } } : {}),
      })
      setSyncResult(result)
      setDeliveryTitle((current) => current || updateTitle.trim())
      setStep(3)
      await onRefresh?.()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '上传工程和图纸失败') }
    finally { setBusy(false) }
  }

  async function createMr() {
    if (!syncResult) return
    setBusy(true); setError(null)
    try {
      const attachmentMarkdown: string[] = []
      for (const file of attachments) attachmentMarkdown.push((await api.uploadAttachment(file)).markdown)
      const result = await api.createMergeRequest({
        sourceBranch: syncResult.branch, targetBranch: 'main', title: deliveryTitle.trim(),
        description: description.trim(), reviewerIds: [...selectedReviewers],
        feishuLinks: links.map((link) => link.trim()).filter(Boolean), attachmentMarkdown,
      })
      setMrResult(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '提交审核失败') }
    finally { setBusy(false) }
  }

  const nextDisabled = (step === 0 && !selectedPackages.size) || (step === 1 && !updateTitle.trim()) || (step === 3 && !deliveryTitle.trim()) || (step === 4 && !selectedReviewers.size) || busy
  return <GuidedWorkflow currentStep={step} description="选择交付图纸，提交管理员审核；管理员批准后自动发布到铁炉堡。" nextDisabled={nextDisabled} nextLabel={step === 2 ? (busy ? '正在上传' : '上传图纸') : step === 5 ? (busy ? '正在提交' : '创建审核单') : '下一步'} onBack={step > 0 && !mrResult ? () => setStep((current) => current - 1) : undefined} onNext={mrResult ? undefined : step === 2 ? () => void sync() : step === 5 ? () => void createMr() : () => setStep((current) => current + 1)} steps={steps} title="提交图纸到铁炉堡">
    {error ? <div className="delivery-alert delivery-alert--error">{error}</div> : null}
    {mrResult ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>已提交管理员审核</h2><p>管理员审核单 #{mrResult.iid} 已创建。管理员批准后，图纸会发布到铁炉堡。</p><div className="success-actions">{mrResult.webUrl ? <a className="button button--secondary" href={mrResult.webUrl} rel="noreferrer" target="_blank">打开审核单</a> : null}<a className="button button--primary" href="http://ironforge.holo.tp/projects" rel="noreferrer" target="_blank">打开铁炉堡</a></div></div> : null}
    {!mrResult && step === 0 ? <div><Intro title="选择本次要交付的包">勾选母文件夹；展开后可以核对目录和本次变动，子文件不需要逐个勾选。</Intro>{packages.map((item) => <PackageTree changes={repository.changes} item={item} key={item.id} onToggle={() => togglePackage(item.id)} selected={selectedPackages.has(item.id)} />)}</div> : null}
    {!mrResult && step === 1 ? <div><Intro title="填写本次更新">更新标题会显示在公司项目服务器的历史记录中；交付标签用于标记关键版本，不能与已有标签重复。</Intro><label className="plain-field"><span>本次更新标题</span><input aria-label="本次更新标题" onChange={(event) => setUpdateTitle(event.target.value)} placeholder="例如：更新 T2 设变零件" value={updateTitle} /></label><label className="plain-field spaced-field"><span>本次交付标签（可选）</span><input aria-label="本次交付标签" onChange={(event) => setTag(event.target.value)} placeholder="例如：T2设变零件" value={tag} /></label></div> : null}
    {!mrResult && step === 2 ? <div><Intro title="确认上传工程和图纸">软件会上传整个项目的有效改动，自动更新铁炉堡交付清单，并包含选中的交付图纸文件夹。</Intro><dl className="confirm-list"><div><dt>本次操作项目</dt><dd>{repository.displayName}</dd></div><div><dt>这台电脑上的文件夹</dt><dd>{repository.path}</dd></div><div><dt>当前工作版本</dt><dd>{repository.branch}</dd></div><div><dt>项目改动</dt><dd>{repository.changes.length} 个文件</dd></div><div><dt>交付图纸文件夹</dt><dd>{selectedPackages.size} 个</dd></div><div><dt>本次更新标题</dt><dd>{updateTitle}</dd></div><div><dt>本次交付标签</dt><dd>{tag || '不创建'}</dd></div></dl></div> : null}
    {!mrResult && step === 3 ? <div><Intro title="填写交付内容">这是管理员在公司项目服务器的审核单里看到的标题和补充资料。</Intro><MergeRequestEditor attachments={attachments} description={description} feishuLinks={links} onAttachmentsChange={setAttachments} onDescriptionChange={setDescription} onFeishuLinksChange={setLinks} onTitleChange={setDeliveryTitle} title={deliveryTitle} /></div> : null}
    {!mrResult && step === 4 ? <div><Intro title="选择管理员审核">至少选择一位审核人。上传工程本身不需要审核，这里选择的是图纸交付审核人。</Intro><ReviewerSelector onToggle={toggleReviewer} reviewers={reviewers} selectedIds={selectedReviewers} /></div> : null}
    {!mrResult && step === 5 ? <div><Intro title="确认提交审核">创建管理员审核单后等待批准；批准并合入正式版本，就代表发布到铁炉堡。</Intro><dl className="confirm-list"><div><dt><PackageCheck size={16} />本次交付标题</dt><dd>{deliveryTitle}</dd></div><div><dt>审核人数</dt><dd>{selectedReviewers.size} 人</dd></div><div><dt>附件与链接</dt><dd>{attachments.length + links.filter(Boolean).length} 项</dd></div></dl></div> : null}
  </GuidedWorkflow>
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wizard-panel__intro"><h2>{title}</h2><p>{children}</p></div>
}
