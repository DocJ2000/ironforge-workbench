export interface CommitRequest {
  message: string
  paths: string[]
  confirmedDeletions: string[]
}

export interface CommitPreview {
  branch: string
  message: string
  paths: string[]
  deletedCadPaths: string[]
}

export interface CommitResult {
  branch: string
  commit: string
  paths: string[]
}

async function postJson<T>(path: string, value: CommitRequest): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(value),
  })
  const payload = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '本地 Commit 操作失败')
  return payload
}

export interface CommitApi {
  preview: (request: CommitRequest) => Promise<CommitPreview>
  commit: (request: CommitRequest) => Promise<CommitResult>
}

export const repositoryCommitApi: CommitApi = {
  preview: (request) => postJson('/api/commit/preview', request),
  commit: (request) => postJson('/api/commit', request),
}
