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

export interface DeliveryOverview {
  packages: OutputPackageCandidate[]
  reviewers: GitLabReviewer[]
  reviewerError?: string
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
  const payload = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? `交付操作失败 (${response.status})`)
  }
  return payload
}

export interface DeliveryApi {
  overview: () => Promise<DeliveryOverview>
  preview: (draft: DeliveryDraft) => Promise<DeliveryPreview>
  execute: (draft: DeliveryDraft) => Promise<DeliveryExecutionResult>
  syncGitLab: (draft: GitLabSyncDraft) => Promise<GitLabSyncResult>
  createMergeRequest: (
    draft: MergeRequestDraft,
  ) => Promise<MergeRequestResult>
  createBranch: (input: {
    name: string
    startPoint: string
  }) => Promise<{ branch: string }>
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
    sshKeyPath?: string
  }) => Promise<{ project: { id: string; path: string; name: string } }>
}

function projectPath(path: string, projectId?: string) {
  return projectId
    ? `${path}?projectId=${encodeURIComponent(projectId)}`
    : path
}

export function createDeliveryApi(projectId?: string): DeliveryApi {
  return {
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
  createMergeRequest: (draft) =>
    requestJson(projectPath('/api/gitlab/merge-requests', projectId), {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  createBranch: (input) =>
    requestJson(projectPath('/api/gitlab/branches', projectId), {
      method: 'POST',
      body: JSON.stringify({ input, confirmed: true }),
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
