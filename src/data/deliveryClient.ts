import type {
  DeliveryDraft,
  DeliveryExecutionResult,
  DeliveryPreview,
  GitLabSyncDraft,
  GitLabSyncResult,
  GitLabReviewer,
  MergeRequestDraft,
  MergeRequestResult,
  OutputPackageCandidate,
} from '../domain/delivery'
import type { ConnectionCheckResult, FriendlyError } from '../domain/connection'
import type { BranchSummary } from '../domain/repository'

export class FriendlyOperationError extends Error {
  readonly friendly: FriendlyError
  constructor(friendly: FriendlyError) {
    super(friendly.detail)
    this.friendly = friendly
  }
}

export function friendlyErrorFrom(cause: unknown): FriendlyError {
  if (cause instanceof FriendlyOperationError) return cause.friendly
  return { code: 'unknown_error', title: '操作没有完成', detail: cause instanceof Error ? cause.message : '发生了未知问题', filesSafe: true, nextAction: '重试一次；如果仍然失败，请展开“专业显示”并把内容发给支持人员。' }
}

export interface DeliveryOverview {
  packages: OutputPackageCandidate[]
  reviewers: GitLabReviewer[]
  projectVisibility?: 'private' | 'internal' | 'public' | 'unknown'
  reviewerError?: string
  forgeRoots?: Array<{
    title: string
    root: string
  }>
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  })
  const payload = (await response.json()) as T & { error?: string | FriendlyError }
  if (!response.ok) {
    if (payload.error && typeof payload.error === 'object') throw new FriendlyOperationError(payload.error)
    throw new FriendlyOperationError({ code: 'unknown_error', title: '操作没有完成', detail: payload.error ?? `服务器返回 ${response.status}`, filesSafe: true, nextAction: '按照页面提示检查后重试。' })
  }
  return payload
}

export interface DeliveryApi {
  checkConnection: () => Promise<ConnectionCheckResult>
  overview: () => Promise<DeliveryOverview>
  preview: (draft: DeliveryDraft) => Promise<DeliveryPreview>
  execute: (draft: DeliveryDraft) => Promise<DeliveryExecutionResult>
  syncGitLab: (draft: GitLabSyncDraft) => Promise<GitLabSyncResult>
  retryPush: (branch: string) => Promise<{ branch: string; commit: string }>
  createMergeRequest: (
    draft: MergeRequestDraft,
  ) => Promise<MergeRequestResult>
  getMergeRequestStatus?: (iid: number) => Promise<{
    state: 'opened' | 'closed' | 'merged'
    webUrl: string
  }>
  createBranch: (input: {
    name: string
    startPoint: string
  }) => Promise<{ branch: string }>
  checkoutBranch?: (branch: string) => Promise<{
    branch: string
  }>
  refreshBranches: () => Promise<{
    refreshed: boolean
    branches?: BranchSummary[]
  }>
  uploadAttachment: (file: File) => Promise<{ markdown: string }>
  pull: () => Promise<{
    branch: string
    updated: boolean
    receivedCommits: number
    commit: string
  }>
  clone: (input: {
    remoteUrl: string
    destination: string
  }) => Promise<{ project: { id: string; path: string; name: string } }>
}

function projectPath(path: string, projectId?: string) {
  return projectId
    ? `${path}?projectId=${encodeURIComponent(projectId)}`
    : path
}

export function createDeliveryApi(projectId?: string): DeliveryApi {
  return {
  checkConnection: () =>
    requestJson(projectPath('/api/connection/check', projectId)),
  overview: () => requestJson(projectPath('/api/delivery', projectId)),
  preview: (draft) =>
    requestJson(projectPath('/api/delivery/preview', projectId), {
      method: 'POST',
      body: JSON.stringify({ draft }),
    }),
  execute: (draft) =>
    requestJson(projectPath('/api/delivery/execute', projectId), {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  syncGitLab: (draft) =>
    requestJson(projectPath('/api/gitlab/sync', projectId), {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  retryPush: (branch) =>
    requestJson(projectPath('/api/gitlab/retry-push', projectId), {
      method: 'POST',
      body: JSON.stringify({ branch, confirmed: true }),
    }),
  createMergeRequest: (draft) =>
    requestJson(projectPath('/api/gitlab/merge-requests', projectId), {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  getMergeRequestStatus: (iid) => {
    const path = projectPath('/api/gitlab/merge-request-status', projectId)
    return requestJson(`${path}${path.includes('?') ? '&' : '?'}iid=${encodeURIComponent(iid)}`)
  },
  createBranch: (input) =>
    requestJson(projectPath('/api/gitlab/branches', projectId), {
      method: 'POST',
      body: JSON.stringify({ input, confirmed: true }),
    }),
  checkoutBranch: (branch) =>
    requestJson(projectPath('/api/gitlab/branches/checkout', projectId), {
      method: 'POST',
      body: JSON.stringify({ branch, confirmed: true }),
    }),
  refreshBranches: () =>
    requestJson(projectPath('/api/gitlab/branches/refresh', projectId), {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    }),
  pull: () =>
    requestJson(projectPath('/api/gitlab/pull', projectId), {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    }),
  clone: (input) =>
    requestJson('/api/gitlab/clone', {
      method: 'POST',
      body: JSON.stringify({ input, confirmed: true }),
    }),
  uploadAttachment: async (file) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(projectPath('/api/gitlab/uploads', projectId), {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    })
    const payload = (await response.json()) as {
      markdown?: string
      error?: string
    }
    if (!response.ok || !payload.markdown) {
      throw new Error(payload.error ?? '附件上传失败')
    }
    return { markdown: payload.markdown }
  },
}
}

export const deliveryApi: DeliveryApi = createDeliveryApi()
