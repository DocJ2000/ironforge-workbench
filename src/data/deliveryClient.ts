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
}

export const deliveryApi: DeliveryApi = {
  overview: () => requestJson('/api/delivery'),
  preview: (draft) =>
    requestJson('/api/delivery/preview', {
      method: 'POST',
      body: JSON.stringify({ draft }),
    }),
  execute: (draft) =>
    requestJson('/api/delivery/execute', {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  syncGitLab: (draft) =>
    requestJson('/api/gitlab/sync', {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  createMergeRequest: (draft) =>
    requestJson('/api/gitlab/merge-requests', {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
  createBranch: (input) =>
    requestJson('/api/gitlab/branches', {
      method: 'POST',
      body: JSON.stringify({ input, confirmed: true }),
    }),
  uploadAttachment: async (file) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/gitlab/uploads', {
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
