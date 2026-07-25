import type {
  DeliveryDraft,
  DeliveryExecutionResult,
  DeliveryPreview,
  GitLabSyncDraft,
  GitLabSyncResult,
  GitLabReviewer,
  IronforgePublishDraft,
  IronforgePublishResult,
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
  publish: (draft: IronforgePublishDraft) => Promise<IronforgePublishResult>
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
  publish: (draft) =>
    requestJson('/api/ironforge/publish', {
      method: 'POST',
      body: JSON.stringify({ draft, confirmed: true }),
    }),
}
