import {
  ArrowLeft,
  CloudDownload,
  ExternalLink,
  GitBranch,
  GitMerge,
  History,
  Plus,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import { CreateBranchDialog } from '../delivery/CreateBranchDialog'
import '../delivery/delivery.css'
import { mergeRequestReceiptClient } from '../../data/mergeRequestReceiptClient'
import { organizationClient } from '../../data/organizationClient'
import { uploadReceiptClient } from '../../data/uploadReceiptClient'
import type { RepositorySnapshot } from '../../domain/repository'
import { branchStartNames, uploadBranchNames } from './uploadBranchRules'
import './projectActions.css'

export function ProjectActionsPage({
  repository,
  api = deliveryApi,
  onRefresh,
}: {
  repository: RepositorySnapshot
  api?: DeliveryApi
  onRefresh?: () => Promise<void>
}) {
  const gitLabBase = organizationClient.load().gitlabUrl.replace(/\/+$/, '')
  const projectUrl = gitLabBase && repository.gitlabPath
    ? `${gitLabBase}/${repository.gitlabPath}`
    : ''
  const [availableBranches, setAvailableBranches] = useState(() => uploadBranchNames(repository))
  const [selectedBranch, setSelectedBranch] = useState(() => (
    uploadBranchNames(repository).includes(repository.branch)
      ? repository.branch
      : uploadBranchNames(repository)[0] ?? ''
  ))
  const [switchingBranch, setSwitchingBranch] = useState(false)
  const [refreshingBranches, setRefreshingBranches] = useState(false)
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchError, setBranchError] = useState('')
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchStart, setNewBranchStart] = useState(repository.branch)
  const mergeRequestReceipt = mergeRequestReceiptClient.load(repository.id)
  const uploadReceipt = uploadReceiptClient.load(repository.id)
  const matchesCommit = (commit?: string) => Boolean(
    commit
    && (commit.startsWith(repository.latestCommit) || repository.latestCommit.startsWith(commit)),
  )
  const uploadedBranchReady = Boolean(
    uploadReceipt?.branch === repository.branch
    && matchesCommit(uploadReceipt.commit)
    && repository.branch !== 'main'
    && repository.changes.length === 0
    && repository.ahead === 0
    && repository.behind === 0
    && repository.deliveryPackages.length > 0
  )
  const existingMergeRequest = Boolean(
    mergeRequestReceipt?.sourceBranch === repository.branch
    && matchesCommit(mergeRequestReceipt.sourceCommit),
  )
  const currentBranchIsCloudWork = availableBranches.includes(repository.branch)
  const canUpload = repository.changes.length > 0 || repository.ahead > 0
  const startPointNames = useMemo(() => branchStartNames(repository), [repository])

  useEffect(() => {
    const nextBranches = uploadBranchNames(repository)
    setAvailableBranches(nextBranches)
    setSelectedBranch((current) => {
      if (current && nextBranches.includes(current)) return current
      if (nextBranches.includes(repository.branch)) return repository.branch
      return nextBranches[0] ?? ''
    })
  }, [repository])

  async function refreshBranchList() {
    if (!api.refreshBranches) return
    setRefreshingBranches(true)
    setBranchError('')
    try {
      const result = await api.refreshBranches()
      if (result.branches) {
        const nextBranches = result.branches
          .filter((item) => item.remote && item.name.startsWith('dev/'))
          .map((item) => item.name)
          .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        setAvailableBranches(nextBranches)
        setSelectedBranch((current) => {
          if (current && nextBranches.includes(current)) return current
          if (nextBranches.includes(repository.branch)) return repository.branch
          return nextBranches[0] ?? ''
        })
      }
      await onRefresh?.()
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setBranchError(`${friendly.title}：${friendly.detail}`)
    } finally {
      setRefreshingBranches(false)
    }
  }

  async function checkoutBranch() {
    if (!selectedBranch || !api.checkoutBranch) return
    setSwitchingBranch(true)
    setBranchError('')
    try {
      await api.checkoutBranch(selectedBranch)
      await onRefresh?.()
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setBranchError(`${friendly.title}：${friendly.detail}`)
    } finally {
      setSwitchingBranch(false)
    }
  }

  async function createBranch() {
    if (!newBranchName.trim() || !api.createBranch) return
    setCreatingBranch(true)
    setBranchError('')
    try {
      const created = await api.createBranch({
        name: newBranchName.trim(),
        startPoint: newBranchStart,
      })
      const nextBranches = Array.from(new Set([...availableBranches, created.branch]))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      setAvailableBranches(nextBranches)
      setSelectedBranch(created.branch)
      setShowCreateBranch(false)
      setNewBranchName('')
      if (api.checkoutBranch) {
        await api.checkoutBranch(created.branch)
      }
      await onRefresh?.()
    } catch (cause) {
      const friendly = friendlyErrorFrom(cause)
      setBranchError(`${friendly.title}：${friendly.detail}`)
    } finally {
      setCreatingBranch(false)
    }
  }

  return (
    <div className="task-page project-actions-page">
      <Link className="project-actions__back" to="/workspace">
        <ArrowLeft size={17} />
        返回项目列表
      </Link>
      <header>
        <span className="task-eyebrow">已选择项目</span>
        <h1>{repository.displayName}</h1>
        <p>这次想做什么？请选择一项。</p>
        {projectUrl ? <a className="project-actions__gitlab-link" href={projectUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />在 GitLab 查看本项目</a> : null}
        </header>
      <section className={`project-branch-switcher${currentBranchIsCloudWork ? '' : ' project-branch-switcher--warning'}`}>
        <span className="project-branch-switcher__icon"><GitBranch size={22} /></span>
        <div>
          <strong>当前本机工作分支：{repository.branch}</strong>
          <small>
            {currentBranchIsCloudWork
              ? '传统 Git 流程会先确认 checkout 到哪个分支，再上传或下载。'
              : '这个分支不在 GitLab 云端开发分支列表里，可能已经被删除。请先切换到一个云端已有分支。'}
          </small>
          {branchError ? <p className="project-branch-switcher__error">{branchError}</p> : null}
        </div>
        <label>
          <span>切换到</span>
          <select
            aria-label="切换到哪个工作分支"
            disabled={!availableBranches.length || switchingBranch || refreshingBranches}
            onChange={(event) => setSelectedBranch(event.target.value)}
            value={selectedBranch}
          >
            {!availableBranches.length ? <option value="">没有云端开发分支</option> : null}
            {availableBranches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </label>
        <div className="project-branch-switcher__actions">
          <button
            className="button button--secondary"
            disabled={!api.refreshBranches || refreshingBranches}
            onClick={() => void refreshBranchList()}
            type="button"
          >
            <RefreshCw size={16} />
            {refreshingBranches ? '正在刷新' : '刷新工作版本'}
          </button>
          <button
            className="button button--secondary"
            disabled={!selectedBranch || selectedBranch === repository.branch || switchingBranch}
            onClick={() => void checkoutBranch()}
            type="button"
          >
            {switchingBranch ? '正在切换' : '切换分支'}
          </button>
          <button
            className="button button--primary"
            disabled={!api.createBranch || !startPointNames.length || creatingBranch}
            onClick={() => {
              setNewBranchStart(selectedBranch || repository.branch)
              setShowCreateBranch(true)
            }}
            type="button"
          >
            <Plus size={16} />
            新建工作版本
          </button>
        </div>
      </section>
      <div className="project-action-choices">
        {uploadedBranchReady || existingMergeRequest ? (
          <Link className="project-action-choices__review" to="/workspace/upload/ironforge">
            <span className="project-action-choices__icon"><GitMerge size={28} /></span>
            <span>
              <strong>{existingMergeRequest ? '查看合并审核' : '提交合并审核'}</strong>
              <small>
                {existingMergeRequest
                  ? '查看最近一次审核的状态和 GitLab 页面。'
                  : `将服务器上的 ${repository.branch} 提交管理员审核，审核通过后合入 main。`}
              </small>
            </span>
          </Link>
        ) : null}
        {canUpload ? <Link to="/workspace/upload/gitlab">
          <span className="project-action-choices__icon"><UploadCloud size={28} /></span>
          <span><strong>上传我的修改</strong><small>把这台电脑上的新内容保存到公司服务器。</small></span>
        </Link> : <div className="project-action-choices__disabled">
          <span className="project-action-choices__icon"><UploadCloud size={28} /></span>
          <span><strong>上传我的修改</strong><small>当前工作分支没有本机修改，也没有待上传提交。</small></span>
        </div>}
        <Link to="/workspace/retrieve">
          <span className="project-action-choices__icon"><CloudDownload size={28} /></span>
          <span><strong>下载服务器内容</strong><small>把同事上传的新内容更新到这台电脑。</small></span>
        </Link>
        <Link to="/history">
          <span className="project-action-choices__icon"><History size={28} /></span>
          <span><strong>查看操作历史</strong><small>查看这个项目以前的上传、下载和审核记录。</small></span>
        </Link>
      </div>
      {showCreateBranch ? (
        <CreateBranchDialog
          branchName={newBranchName}
          branches={startPointNames}
          busy={creatingBranch}
          onBranchNameChange={setNewBranchName}
          onCancel={() => setShowCreateBranch(false)}
          onConfirm={() => void createBranch()}
          onStartPointChange={setNewBranchStart}
          startPoint={newBranchStart}
        />
      ) : null}
    </div>
  )
}
