import { CheckCircle2, PackageCheck, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import { notificationClient } from '../../data/notificationClient'
import { organizationClient } from '../../data/organizationClient'
import { workflowDraftClient } from '../../data/workflowDraftClient'
import { mergeRequestReceiptClient } from '../../data/mergeRequestReceiptClient'
import type { GitLabReviewer } from '../../domain/delivery'
import type { RepositorySnapshot } from '../../domain/repository'
import { MergeRequestEditor } from '../delivery/MergeRequestEditor'
import { ReviewerSelector } from '../delivery/ReviewerSelector'
import { GuidedWorkflow } from './GuidedWorkflow'
import './ironforgeDelivery.css'
import './deliverySuccess.css'

interface Props { repository: RepositorySnapshot; api?: DeliveryApi; onRefresh?: () => Promise<void> }
const steps = ['确认交付文件', '填写交付说明', '建立版本标记', '选择审核人', '确认交付']

export function IronforgeDeliveryPage({ repository, api = deliveryApi }: Props) {
  const ironforgeUrl = organizationClient.load().ironforgeUrl
  const storedMergeRequest = mergeRequestReceiptClient.load(repository.id)
  const activeMergeRequest = storedMergeRequest
    && storedMergeRequest.sourceBranch === repository.branch
    && (
      storedMergeRequest.sourceCommit.startsWith(repository.latestCommit)
      || repository.latestCommit.startsWith(storedMergeRequest.sourceCommit)
    )
    ? storedMergeRequest
    : null
  const uploadReady = Boolean(
    repository.changes.length === 0
    && repository.ahead === 0
    && repository.behind === 0
    && repository.deliveryPackages.length > 0,
  )
  const initialDraft = useRef(workflowDraftClient.loadMergeRequest(repository.id)).current
  const [step, setStep] = useState(() => Math.min(initialDraft?.step ?? 0, steps.length - 1))
  const [reviewers, setReviewers] = useState<GitLabReviewer[]>([])
  const [selectedReviewers, setSelectedReviewers] = useState<Set<number>>(
    () => new Set(initialDraft?.reviewerIds ?? []),
  )
  const [reviewersLoaded, setReviewersLoaded] = useState(false)
  const [title, setTitle] = useState(initialDraft?.title ?? '')
  const [description, setDescription] = useState(initialDraft?.description ?? '')
  const [links, setLinks] = useState<string[]>(initialDraft?.links ?? [])
  const [attachments, setAttachments] = useState<File[]>([])
  const [tagEnabled, setTagEnabled] = useState(initialDraft?.tagEnabled ?? false)
  const [tagName, setTagName] = useState(initialDraft?.tagName ?? '')
  const [tagMessage, setTagMessage] = useState(initialDraft?.tagMessage ?? '')
  const [result, setResult] = useState<{ iid: number; webUrl: string } | null>(
    activeMergeRequest
      ? { iid: activeMergeRequest.iid, webUrl: activeMergeRequest.webUrl }
      : null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReturnType<typeof friendlyErrorFrom> | null>(null)
  const [mrState, setMrState] = useState<'opened' | 'closed' | 'merged'>(
    activeMergeRequest?.state ?? 'opened',
  )
  const notifiedMrState = useRef<'closed' | 'merged' | null>(null)
  const uploadedAttachments = useRef(new Map<string, string>())

  useEffect(() => {
    if (!uploadReady) return
    let active = true
    void api.overview().then((overview) => {
      if (!active) return
      setReviewers(overview.reviewers)
      const availableIds = new Set(overview.reviewers.map((item) => item.id))
      const restoredIds = initialDraft?.reviewerIds.filter((id) => availableIds.has(id))
      setSelectedReviewers(new Set(
        restoredIds?.length
          ? restoredIds
          : overview.reviewers.filter((item) => item.recommended).map((item) => item.id),
      ))
      setReviewersLoaded(true)
    }).catch((cause) => active && setError(friendlyErrorFrom(cause)))
    return () => { active = false }
  }, [api, initialDraft, uploadReady])

  useEffect(() => {
    if (!uploadReady || !reviewersLoaded || result) return
    workflowDraftClient.saveMergeRequest(repository.id, {
      step,
      title,
      description,
      links,
      reviewerIds: [...selectedReviewers],
      attachmentNames: attachments.map((file) => file.name),
      tagEnabled,
      tagName,
      tagMessage,
    })
  }, [
    attachments,
    description,
    links,
    repository.id,
    result,
    reviewersLoaded,
    selectedReviewers,
    step,
    tagEnabled,
    tagMessage,
    tagName,
    title,
    uploadReady,
  ])

  useEffect(() => {
    if (!result || !api.getMergeRequestStatus) return
    let active = true
    let terminal = false
    let timer: number | undefined
    const check = async () => {
      if (terminal) return
      try {
        const status = await api.getMergeRequestStatus?.(result.iid)
        if (!active || !status || status.state === 'opened') return
        terminal = true
        if (timer !== undefined) window.clearInterval(timer)
        setMrState(status.state)
        mergeRequestReceiptClient.updateState(repository.id, status.state)
        if (notifiedMrState.current === status.state) return
        notifiedMrState.current = status.state
        void notificationClient.show(
          status.state === 'merged' ? '合并审核已通过' : '合并审核已关闭',
          status.state === 'merged'
            ? '审核内容已合入 main，请登录铁炉堡查看发布结果。'
            : '本次审核已被管理员关闭。',
        )
      } catch {
        // A temporary polling failure should not interrupt the completed submission.
      }
    }
    void check()
    timer = window.setInterval(() => void check(), 30_000)
    return () => {
      active = false
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [api, repository.id, result])

  function toggleReviewer(id: number) {
    setSelectedReviewers((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function createMr() {
    setBusy(true); setError(null)
    try {
      const attachmentMarkdown: string[] = []
      for (const file of attachments) {
        const key = `${file.name}:${file.size}:${file.lastModified}`
        let markdown = uploadedAttachments.current.get(key)
        if (!markdown) {
          markdown = (await api.uploadAttachment(file)).markdown
          uploadedAttachments.current.set(key, markdown)
        }
        attachmentMarkdown.push(markdown)
      }
      const created = await api.createMergeRequest({
        sourceBranch: repository.branch, targetBranch: 'main', title: title.trim(),
        description: description.trim(), reviewerIds: [...selectedReviewers],
        feishuLinks: links.map((link) => link.trim()).filter(Boolean), attachmentMarkdown,
        ...(tagEnabled ? { tag: { name: tagName.trim(), message: tagMessage.trim() } } : {}),
      })
      setResult(created)
      mergeRequestReceiptClient.save(repository.id, {
        iid: created.iid,
        webUrl: created.webUrl,
        sourceBranch: repository.branch,
        sourceCommit: repository.latestCommit,
        state: 'opened',
      })
      workflowDraftClient.clearMergeRequest(repository.id)
      void notificationClient.show('交付审核已提交', '审核单已经创建，正在等待管理员处理。')
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setError(friendly)
      void notificationClient.show('交付审核提交失败', friendly.title)
    }
    finally { setBusy(false) }
  }

  if (!uploadReady) return <section className="ironforge-upload-required"><span><UploadCloud size={30} /></span><p className="task-eyebrow">请先完成上传</p><h1>项目还没有准备好交付</h1><p>铁炉堡只能交付已经上传到 GitLab 的内容。请先完成“上传整个工程”，其中会选择交付包并生成 charge.json。</p><Link className="button button--primary" to="/workspace/upload/gitlab">去上传这个项目</Link></section>

  return <GuidedWorkflow currentStep={step} description="核对已经上传的交付清单；关键版本先建立版本标记，再创建合并审核。" nextDisabled={(step === 0 && !repository.deliveryPackages.length) || (step === 1 && !title.trim()) || (step === 2 && tagEnabled && (!tagName.trim() || !tagMessage.trim())) || (step === 3 && !selectedReviewers.size) || busy} nextLabel={step === 4 ? (busy ? '正在提交' : '确认交付') : '下一步'} onBack={step > 0 && !result ? () => setStep((current) => current - 1) : undefined} onNext={result ? undefined : step === 4 ? () => void createMr() : () => setStep((current) => current + 1)} steps={steps} title="提交合并审核">
    {error ? <div className="delivery-alert delivery-alert--error"><strong>{error.title}</strong><p>{error.detail}</p><p>{error.nextAction}</p></div> : null}
    {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>{mrState === 'merged' ? '合并审核已通过' : mrState === 'closed' ? '合并审核已关闭' : '已提交管理员审核'}</h2><p>{mrState === 'opened' ? `审核单 #${result.iid} 已创建，正在等待管理员审核。` : mrState === 'merged' ? `审核单 #${result.iid} 已合入 main。软件不判断铁炉堡发布结果，请登录铁炉堡查看。` : `审核单 #${result.iid} 已被关闭，本次内容没有合入 main。`}</p><div className="success-actions">{result.webUrl ? <a className="button button--secondary" href={result.webUrl} rel="noreferrer" target="_blank">查看本次审核单</a> : null}{mrState === 'merged' && ironforgeUrl ? <a className="button button--primary" href={ironforgeUrl} rel="noreferrer" target="_blank">打开铁炉堡查看</a> : null}</div></div> : null}
    {!result && step === 0 ? <div><Intro title="确认本次交付文件">这里读取的是上传时已经写入 charge.json 的交付包，不会再次修改或上传工程。</Intro><dl className="confirm-list">{repository.deliveryPackages.map((item) => <div key={item.id}><dt>{item.name}</dt><dd>{item.path}</dd></div>)}</dl></div> : null}
    {!result && step === 1 ? <div><Intro title="填写管理员看到的交付说明">标题必填；备注可以填写修改原因、影响范围，并可附飞书链接或 PDF。</Intro>{initialDraft?.attachmentNames?.length && !attachments.length ? <div className="delivery-alert delivery-alert--warning"><strong>请重新选择附件</strong><p>上次选择了 {initialDraft.attachmentNames.join('、')}。出于电脑安全限制，软件不能自动重新读取本地附件。</p></div> : null}<MergeRequestEditor attachments={attachments} description={description} feishuLinks={links} onAttachmentsChange={setAttachments} onDescriptionChange={setDescription} onFeishuLinksChange={setLinks} onTitleChange={setTitle} title={title} /></div> : null}
    {!result && step === 2 ? <div><Intro title="这次是否需要留下版本标记？">普通修改可以不建立；T0、T1、T2 定版、打样或设变等关键节点建议建立。</Intro><label className="tag-choice"><input checked={tagEnabled} onChange={(event) => setTagEnabled(event.target.checked)} type="checkbox" /><span><strong>为这次关键版本建立标记（Tag）</strong><small>标记会固定指向当前工作版本的最新提交，建立后不会自动移动或覆盖。</small></span></label>{tagEnabled ? <div className="tag-fields"><label className="plain-field"><span>本次版本标记</span><input aria-label="本次版本标记" onChange={(event) => setTagName(event.target.value)} placeholder="例如：T2-第二次打样" value={tagName} /></label><label className="plain-field"><span>版本标记说明</span><textarea aria-label="版本标记说明" onChange={(event) => setTagMessage(event.target.value)} placeholder="说明这个版本用于什么" rows={4} value={tagMessage} /></label></div> : <p className="change-review-note">本次只创建合并审核，不建立版本标记。</p>}</div> : null}
    {!result && step === 3 ? <div><Intro title="选择管理员审核">至少选择一位审核人。普通上传不需要审核，这一步审核的是正式交付。</Intro><ReviewerSelector onToggle={toggleReviewer} reviewers={reviewers} selectedIds={selectedReviewers} /></div> : null}
    {!result && step === 4 ? <div><Intro title="确认创建审核单">{tagEnabled ? '软件会先建立并上传版本标记，再创建审核单。' : '本次不建立版本标记，直接创建审核单。'}源工作版本是 {repository.branch}，目标固定为受保护的 main。</Intro><dl className="confirm-list"><div><dt><PackageCheck size={16} />交付包</dt><dd>{repository.deliveryPackages.length} 个</dd></div><div><dt>版本标记</dt><dd>{tagEnabled ? tagName : '本次不建立'}</dd></div><div><dt>交付标题</dt><dd>{title}</dd></div><div><dt>审核人</dt><dd>{selectedReviewers.size} 人</dd></div><div><dt>合入目标</dt><dd>main（受保护主分支）</dd></div></dl></div> : null}
  </GuidedWorkflow>
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wizard-panel__intro"><h2>{title}</h2><p>{children}</p></div>
}
