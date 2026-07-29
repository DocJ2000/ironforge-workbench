export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export type ChangeKind = 'modified' | 'added' | 'deleted' | 'untracked'

export interface WorkingTreeChange {
  id: string
  path: string
  name: string
  kind: ChangeKind
  fileType: string
  size: string
  isCad: boolean
  lfsTracked: boolean
}

export interface DeliveryPackage {
  id: string
  name: string
  path: string
  supplier: string
  files: Array<{
    name: string
    type: string
    size: string
  }>
  validation: 'valid' | 'warning' | 'invalid'
}

export interface BranchSummary {
  name: string
  stage: string
  commit: string
  commitMessage: string
  updatedAt: string
  remote: boolean
  current: boolean
}

export interface MergeRequestSummary {
  id: number
  sourceBranch: string
  targetBranch: string
  title: string
  status: 'draft' | 'waiting' | 'approved' | 'merged'
  reviewer: string
}

export interface PublishJobSummary {
  id: string
  status: 'not_started' | 'running' | 'failed' | 'success'
  commit: string
  packageCount: number
  publishedAt?: string
}

export interface HistoryEvent {
  id: string
  type: 'commit' | 'push' | 'merge_request' | 'merge' | 'publish'
  title: string
  description: string
  actor: string
  timestamp: string
  reference: string
  tone: StatusTone
  branches?: string[]
}

export interface RepositorySnapshot {
  id: string
  name: string
  displayName: string
  path: string
  gitlabPath: string
  branch: string
  upstream: string
  stage: string
  ahead: number
  behind: number
  latestCommit: string
  latestCommitMessage: string
  changes: WorkingTreeChange[]
  branches: BranchSummary[]
  deliveryPackages: DeliveryPackage[]
  mergeRequest: MergeRequestSummary
  publishJob: PublishJobSummary
  history: HistoryEvent[]
}

export interface RepositorySyncSummary {
  syncLabel: string
  syncTone: StatusTone
}

export function summarizeRepository(
  state: Pick<RepositorySnapshot, 'ahead' | 'behind'>,
): RepositorySyncSummary {
  if (state.ahead > 0 && state.behind > 0) {
    return {
      syncLabel: '电脑和公司服务器都有新修改，需要同事协助处理',
      syncTone: 'danger',
    }
  }

  if (state.behind > 0) {
    return {
      syncLabel: `公司服务器有 ${state.behind} 个新版本`,
      syncTone: 'warning',
    }
  }

  if (state.ahead > 0) {
    return {
      syncLabel: `有 ${state.ahead} 个本地版本待上传`,
      syncTone: 'warning',
    }
  }

  return {
    syncLabel: '电脑和公司服务器内容一致',
    syncTone: 'success',
  }
}
