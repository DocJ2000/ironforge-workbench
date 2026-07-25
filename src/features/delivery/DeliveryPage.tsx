import {
  CheckCircle2,
  FileStack,
  GitBranch,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  deliveryApi,
  type DeliveryApi,
} from '../../data/deliveryClient'
import type {
  DeliveryDraft,
  GitLabReviewer,
  OutputPackageCandidate,
} from '../../domain/delivery'
import type { RepositorySnapshot } from '../../domain/repository'
import { ChangeSummary } from './ChangeSummary'
import { GitLabSyncDialog } from './GitLabSyncDialog'
import { IronforgePublishDialog } from './IronforgePublishDialog'
import { PackageSelector } from './PackageSelector'
import { ReviewerSelector } from './ReviewerSelector'
import './delivery.css'

interface DeliveryPageProps {
  repository: RepositorySnapshot
  api?: DeliveryApi
  onRefresh?: () => Promise<void>
  initialMergeRequest?: {
    iid: number
    status: 'waiting' | 'approved'
  }
}

export function DeliveryPage({
  repository,
  api = deliveryApi,
  onRefresh,
  initialMergeRequest,
}: DeliveryPageProps) {
  const [packages, setPackages] = useState<OutputPackageCandidate[]>([])
  const [reviewers, setReviewers] = useState<GitLabReviewer[]>([])
  const [reviewerError, setReviewerError] = useState<string | null>(null)
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    new Set(),
  )
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<number>>(
    new Set(),
  )
  const [showChanges, setShowChanges] = useState(false)
  const [openPackage, setOpenPackage] =
    useState<OutputPackageCandidate | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncComment, setSyncComment] = useState('')
  const [publishComment, setPublishComment] = useState('')
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    iid: number
    url: string
  } | null>(
    initialMergeRequest
      ? { iid: initialMergeRequest.iid, url: '' }
      : null,
  )
  const [mergeRequestStatus, setMergeRequestStatus] = useState<
    'none' | 'waiting' | 'approved'
  >(initialMergeRequest?.status ?? 'none')
  const [publishResult, setPublishResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void api
      .overview()
      .then((overview) => {
        if (cancelled) return
        setPackages(overview.packages)
        setReviewers(overview.reviewers)
        setReviewerError(overview.reviewerError ?? null)
        setSelectedPackageIds(
          new Set(overview.packages.map((item) => item.id)),
        )
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : '无法读取交付包和审核人',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const changePaths = useMemo(
    () => repository.changes.map((change) => change.path),
    [repository.changes],
  )
  const canSync =
    changePaths.length > 0 && selectedReviewerIds.size > 0 && !busy

  function togglePackage(id: string) {
    setSelectedPackageIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleReviewer(id: number) {
    setSelectedReviewerIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function draft(): DeliveryDraft {
    return {
      message: syncComment.trim(),
      changePaths,
      confirmedDeletions: [],
      selectedPackageIds: [...selectedPackageIds],
      reviewerIds: [...selectedReviewerIds],
      targetBranch: 'main',
      mrTitle: syncComment.trim(),
    }
  }

  async function handleSync() {
    setBusy(true)
    setError(null)
    try {
      const execution = await api.execute(draft())
      setResult({
        iid: execution.mergeRequestIid,
        url: execution.mergeRequestUrl,
      })
      setMergeRequestStatus('waiting')
      setShowSyncDialog(false)
      await onRefresh?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'GitLab 同步失败')
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!result) return
    setBusy(true)
    setError(null)
    try {
      const publication = await api.publish({
        mergeRequestIid: result.iid,
        packageIds: [...selectedPackageIds],
        comment: publishComment.trim(),
      })
      setPublishResult(
        `Ironforge 发布任务 ${publication.jobId} 已创建，共 ${publication.packageCount} 个交付包。`,
      )
      setShowPublishDialog(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ironforge 发布失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page delivery-page">
      <header className="delivery-header">
        <div>
          <span className="delivery-kicker">Engineer delivery</span>
          <h1>准备本次交付</h1>
          <p>
            系统已扫描本地工程。核对文件、选择交付包和审核人，然后同步到
            GitLab。
          </p>
        </div>
        <div className="delivery-header__actions">
          <span className="branch-pill">
            <GitBranch aria-hidden="true" size={15} />
            {repository.branch}
          </span>
          <button
            aria-label="重新扫描工程"
            className="delivery-icon-button delivery-icon-button--bordered"
            onClick={() => void onRefresh?.()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={17} />
          </button>
        </div>
      </header>

      {error ? <div className="delivery-alert delivery-alert--error">{error}</div> : null}
      {result ? (
        <div className="delivery-alert delivery-alert--success">
          <CheckCircle2 aria-hidden="true" size={18} />
          已创建 MR !{result.iid}，正在等待管理员审核。
          {result.url ? (
            <a href={result.url} rel="noreferrer" target="_blank">
              打开 MR
            </a>
          ) : null}
        </div>
      ) : null}
      {publishResult ? (
        <div className="delivery-alert delivery-alert--success">
          <CheckCircle2 aria-hidden="true" size={18} />
          {publishResult}
        </div>
      ) : null}

      <section className="delivery-step">
        <div className="delivery-step__number">1</div>
        <div className="delivery-step__content">
          <header>
            <div>
              <h2>同步到 GitLab</h2>
              <p>同步全部有效工程改动，并创建管理员审核的 MR。</p>
            </div>
            <span className="status-pill status-pill--ready">已扫描</span>
          </header>

          <div className="delivery-summary-grid">
            <button
              aria-label={`${repository.changes.length} 个文件`}
              className="summary-button"
              onClick={() => setShowChanges(true)}
              type="button"
            >
              <FileStack aria-hidden="true" size={19} />
              <span>
                <strong>{repository.changes.length} 个文件</strong>
                <small>点击查看完整清单</small>
              </span>
            </button>
            <button className="summary-button" type="button">
              <CheckCircle2 aria-hidden="true" size={19} />
              <span>
                <strong>charge.json 自动更新</strong>
                <small>跟随下方交付包选择</small>
              </span>
            </button>
            <button className="summary-button" type="button">
              <ShieldCheck aria-hidden="true" size={19} />
              <span>
                <strong>临时文件已排除</strong>
                <small>.superpowers、日志和缓存</small>
              </span>
            </button>
          </div>

          <div className="delivery-subsection">
            <div className="delivery-subsection__heading">
              <div>
                <h3>MR 审核人</h3>
                <p>至少选择一位，选择结果会写入 GitLab Reviewer。</p>
              </div>
              <span>{selectedReviewerIds.size} 位已选</span>
            </div>
            <ReviewerSelector
              onToggle={toggleReviewer}
              reviewers={reviewers}
              selectedIds={selectedReviewerIds}
            />
            {reviewerError ? (
              <p className="reviewer-error">{reviewerError}</p>
            ) : null}
          </div>

          <div className="delivery-action-row">
            <span>
              {selectedReviewerIds.size
                ? '点击后填写同步注释并进行最终确认'
                : '请先选择审核人'}
            </span>
            <button
              className="button button--primary"
              disabled={!canSync}
              onClick={() => setShowSyncDialog(true)}
              type="button"
            >
              <Send aria-hidden="true" size={17} />
              同步到 GitLab
            </button>
          </div>
        </div>
      </section>

      <section className="delivery-step">
        <div className="delivery-step__number">2</div>
        <div className="delivery-step__content">
          <header>
            <div>
              <h2>发布到 Ironforge</h2>
              <p>只发布勾选的 output 包，管理员审核通过后解锁。</p>
            </div>
            <span
              className={`status-pill${
                mergeRequestStatus === 'approved'
                  ? ' status-pill--ready'
                  : ''
              }`}
            >
              {mergeRequestStatus === 'approved'
                ? 'MR 审核通过'
                : '等待 MR 审核'}
            </span>
          </header>
          <PackageSelector
            onOpen={setOpenPackage}
            onToggle={togglePackage}
            packages={packages}
            selectedIds={selectedPackageIds}
          />
          <div className="delivery-action-row">
            <span>已选择 {selectedPackageIds.size} 个交付包</span>
            <button
              className="button button--primary"
              disabled={
                mergeRequestStatus !== 'approved' ||
                selectedPackageIds.size === 0 ||
                busy
              }
              onClick={() => setShowPublishDialog(true)}
              type="button"
            >
              发布到 Ironforge
            </button>
          </div>
        </div>
      </section>

      {showChanges ? (
        <ChangeSummary
          changes={repository.changes}
          onClose={() => setShowChanges(false)}
        />
      ) : null}
      {openPackage ? (
        <div className="delivery-drawer-backdrop">
          <aside
            aria-label={`${openPackage.name} 文件`}
            aria-modal="true"
            className="delivery-drawer"
            role="dialog"
          >
            <header className="delivery-drawer__header">
              <div>
                <span className="delivery-kicker">{openPackage.domain}</span>
                <h2>{openPackage.name}</h2>
              </div>
              <button
                aria-label="关闭交付包文件"
                className="delivery-icon-button"
                onClick={() => setOpenPackage(null)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <ul className="package-file-list">
              {openPackage.files.map((file) => (
                <li key={file.path}>
                  <span>{file.name}</span>
                  <small>
                    {file.type} · {file.size}
                  </small>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}
      {showSyncDialog ? (
        <GitLabSyncDialog
          branch={repository.branch}
          busy={busy}
          comment={syncComment}
          fileCount={repository.changes.length}
          onCancel={() => setShowSyncDialog(false)}
          onCommentChange={setSyncComment}
          onConfirm={() => void handleSync()}
          reviewerCount={selectedReviewerIds.size}
        />
      ) : null}
      {showPublishDialog ? (
        <IronforgePublishDialog
          busy={busy}
          comment={publishComment}
          onCancel={() => setShowPublishDialog(false)}
          onCommentChange={setPublishComment}
          onConfirm={() => void handlePublish()}
          packageCount={selectedPackageIds.size}
        />
      ) : null}
    </div>
  )
}
