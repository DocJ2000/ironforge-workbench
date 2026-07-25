import {
  CheckCircle2,
  FileStack,
  GitBranch,
  RefreshCw,
  Send,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  deliveryApi,
  type DeliveryApi,
} from '../../data/deliveryClient'
import type {
  GitLabReviewer,
  OutputPackageCandidate,
} from '../../domain/delivery'
import type { RepositorySnapshot } from '../../domain/repository'
import { ChangeSummary } from './ChangeSummary'
import { CreateBranchDialog } from './CreateBranchDialog'
import { GitLabSyncDialog } from './GitLabSyncDialog'
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
  const [selectedBranch, setSelectedBranch] = useState(repository.branch)
  const [availableBranches, setAvailableBranches] = useState(
    repository.branches.map((branch) => branch.name),
  )
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchStart, setNewBranchStart] = useState(repository.branch)
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<number>>(
    new Set(),
  )
  const [showChanges, setShowChanges] = useState(false)
  const [openPackage, setOpenPackage] =
    useState<OutputPackageCandidate | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncComment, setSyncComment] = useState('')
  const [tagEnabled, setTagEnabled] = useState(false)
  const [tagStage, setTagStage] = useState('T2')
  const [tagVersion, setTagVersion] = useState('v1')
  const [tagFinal, setTagFinal] = useState(false)
  const [tagMessage, setTagMessage] = useState('')
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
  const [syncResult, setSyncResult] = useState<{
    commit: string
    branch: string
  } | null>(null)

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
  const canSync = changePaths.length > 0 && Boolean(selectedBranch) && !busy
  const tagName =
    tagStage === 'custom'
      ? tagVersion.trim()
      : tagFinal
        ? tagStage
        : `${tagStage}-${tagVersion.trim()}`

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

  async function handleSync() {
    setBusy(true)
    setError(null)
    try {
      const execution = await api.syncGitLab({
        message: syncComment.trim(),
        changePaths,
        confirmedDeletions: [],
        selectedPackageIds: [...selectedPackageIds],
        branch: selectedBranch,
        ...(tagEnabled
          ? { tag: { name: tagName, message: tagMessage.trim() } }
          : {}),
      })
      setSyncResult(execution)
      setShowSyncDialog(false)
      await onRefresh?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'GitLab 同步失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateBranch() {
    setBusy(true)
    setError(null)
    try {
      const created = await api.createBranch({
        name: newBranchName.trim(),
        startPoint: newBranchStart,
      })
      setAvailableBranches((current) => [
        ...current.filter((branch) => branch !== created.branch),
        created.branch,
      ])
      setSelectedBranch(created.branch)
      setNewBranchName('')
      setShowCreateBranch(false)
      await onRefresh?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建分支失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateMergeRequest() {
    if (!syncResult || !selectedReviewerIds.size) return
    setBusy(true)
    setError(null)
    try {
      const mergeRequest = await api.createMergeRequest({
        sourceBranch: syncResult.branch,
        targetBranch: 'main',
        title: syncComment.trim(),
        description: `同步注释：${syncComment.trim()}`,
        reviewerIds: [...selectedReviewerIds],
        feishuLinks: [],
        attachmentMarkdown: [],
      })
      setResult({ iid: mergeRequest.iid, url: mergeRequest.webUrl })
      setMergeRequestStatus('waiting')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MR 创建失败')
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
            系统已扫描本地工程。核对文件、选择交付包和同步分支，先同步到
            GitLab；同步成功后再选择 MR 审核人。
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
      <section className="delivery-step">
        <div className="delivery-step__number">1</div>
        <div className="delivery-step__content">
          <header>
            <div>
              <h2>同步到 GitLab</h2>
              <p>将全部有效工程改动 Commit 并 Push 到所选分支。</p>
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
                <h3>同步分支</h3>
                <p>选择本次 Commit 和 Push 所在的分支。</p>
              </div>
            </div>
            <div className="branch-control">
              <label className="branch-select">
                <span>同步分支</span>
                <select
                  aria-label="同步分支"
                  onChange={(event) => setSelectedBranch(event.target.value)}
                  value={selectedBranch}
                >
                  {availableBranches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                      {branch === repository.branch ? '（当前）' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-label="创建新分支"
                className="delivery-icon-button delivery-icon-button--bordered branch-create-button"
                onClick={() => {
                  setNewBranchStart(selectedBranch)
                  setShowCreateBranch(true)
                }}
                title="创建新分支"
                type="button"
              >
                <Plus aria-hidden="true" size={18} />
              </button>
            </div>
          </div>

          <div className="delivery-subsection">
            <div className="delivery-subsection__heading">
              <div>
                <h3>Ironforge 交付包</h3>
                <p>勾选本次需要发布的 output 包，系统将自动更新 charge.json。</p>
              </div>
              <span>{selectedPackageIds.size} 个已选</span>
            </div>
            <PackageSelector
              onOpen={setOpenPackage}
              onToggle={togglePackage}
              packages={packages}
              selectedIds={selectedPackageIds}
            />
          </div>

          <div className="delivery-action-row">
            <span>点击后填写同步注释并进行最终确认</span>
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
              <h2>提交 Ironforge 发布审核</h2>
              <p>选择管理员并创建 GitLab MR；MR 合并后即完成发布。</p>
            </div>
            <span
              className={`status-pill${
                mergeRequestStatus === 'approved'
                  ? ' status-pill--ready'
                  : ''
              }`}
            >
              {mergeRequestStatus === 'approved'
                ? '已审核发布'
                : result
                  ? '等待管理员审核'
                  : '尚未提交审核'}
            </span>
          </header>
          <div className="delivery-subsection">
            <div className="delivery-subsection__heading">
              <div>
                <h3>MR 审核人</h3>
                <p>审核人将在 GitLab MR 中检查并批准本次 Ironforge 发布。</p>
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
          <div className="mr-action">
            <span>
              {syncResult
                ? `已同步 ${syncResult.commit} 到 ${syncResult.branch}`
                : '请先同步到 GitLab'}
            </span>
            <button
              className="button button--secondary"
              disabled={
                !syncResult ||
                selectedReviewerIds.size === 0 ||
                busy ||
                Boolean(result)
              }
              onClick={() => void handleCreateMergeRequest()}
              type="button"
            >
              提交发布审核
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
          branch={selectedBranch}
          busy={busy}
          comment={syncComment}
          fileCount={repository.changes.length}
          onCancel={() => setShowSyncDialog(false)}
          onCommentChange={setSyncComment}
          onConfirm={() => void handleSync()}
          onTagEnabledChange={setTagEnabled}
          onTagFinalChange={setTagFinal}
          onTagMessageChange={setTagMessage}
          onTagStageChange={setTagStage}
          onTagVersionChange={setTagVersion}
          tagEnabled={tagEnabled}
          tagFinal={tagFinal}
          tagMessage={tagMessage}
          tagName={tagName}
          tagStage={tagStage}
          tagVersion={tagVersion}
        />
      ) : null}
      {showCreateBranch ? (
        <CreateBranchDialog
          branchName={newBranchName}
          branches={availableBranches}
          busy={busy}
          onBranchNameChange={setNewBranchName}
          onCancel={() => setShowCreateBranch(false)}
          onConfirm={() => void handleCreateBranch()}
          onStartPointChange={setNewBranchStart}
          startPoint={newBranchStart}
        />
      ) : null}
    </div>
  )
}
