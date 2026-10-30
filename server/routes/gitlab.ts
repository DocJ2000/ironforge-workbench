import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RepositorySnapshot } from '../../src/domain/repository.js'
import type {
  GitLabSyncDraft,
  MergeRequestDraft,
} from '../../src/domain/delivery.js'
import type { CreateBranchInput } from '../gitBranchOperations.js'
import {
  pruneDeletedTrackedBranches,
  pushRepositoryBranch,
  refreshRepositoryRemoteBranches,
  repositoryBranchCommit,
  validateRetryPushBranch,
} from '../gitBranchOperations.js'
import { createGitLabClient } from '../gitlabClient.js'
import { gitLabProjectPath } from '../gitLabProjectPath.js'
import { mergeCloudBranches } from '../branchSummary.js'
import { pullRepository } from '../repositoryPull.js'
import { toFriendlyError } from '../friendlyError.js'
import { readJson, readUpload, sendJson } from '../http.js'

export interface GitLabCredentials {
  baseUrl: string
  token: string
  sshKeyPath: string
  sshPassphrase?: string
  sshAskPassPath?: string
}

type Confirmed<T> = { draft: T; confirmed: boolean }

export interface GitLabRouteDependencies {
  resolveCredentials: (projectId: string) => Promise<GitLabCredentials>
  fetcher: typeof fetch
  loadSnapshot: (path: string, force?: boolean) => Promise<RepositorySnapshot>
  invalidateProject: (path: string) => void
  markRemoteChecked: (path: string) => void
  sync: (
    path: string,
    projectId: string,
    operation: Confirmed<GitLabSyncDraft>,
  ) => Promise<unknown>
  createMergeRequest: (
    path: string,
    projectId: string,
    operation: Confirmed<MergeRequestDraft>,
  ) => Promise<unknown>
  createBranch: (
    path: string,
    projectId: string,
    input: CreateBranchInput,
  ) => Promise<unknown>
  checkoutBranch: (
    path: string,
    projectId: string,
    branch: string,
  ) => Promise<unknown>
  refreshBranches?: (path: string, projectId: string) => Promise<unknown>
  uploadAttachment: (
    path: string,
    projectId: string,
    upload: { name: string; type: string; bytes: Uint8Array },
  ) => Promise<{ markdown: string }>
  pull?: (path: string) => Promise<unknown>
}

export interface GitLabRouteContext {
  request: IncomingMessage
  response: ServerResponse
  url: URL
  repositoryPath: string
  projectId: string
  deps: GitLabRouteDependencies
}

function remoteCredentials(credentials: GitLabCredentials) {
  return {
    sshKeyPath: credentials.sshKeyPath,
    ...(credentials.sshPassphrase ? { sshPassphrase: credentials.sshPassphrase } : {}),
    ...(credentials.sshAskPassPath ? { sshAskPassPath: credentials.sshAskPassPath } : {}),
  }
}

function gitLabClientFor(credentials: GitLabCredentials, fetcher: typeof fetch) {
  return createGitLabClient({
    baseUrl: credentials.baseUrl,
    token: credentials.token,
    recommendedReviewers: [],
  }, fetcher)
}

export async function handleRetryPush({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  let body: { branch: string; confirmed: boolean }
  try {
    body = await readJson(request)
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request' })
    return
  }
  if (!body.confirmed || !body.branch?.trim()) {
    sendJson(response, 400, { error: 'Retry push must be confirmed' })
    return
  }
  try {
    const branch = validateRetryPushBranch(body.branch)
    const credentials = await deps.resolveCredentials(projectId)
    await pushRepositoryBranch(repositoryPath, branch, remoteCredentials(credentials))
    const commit = await repositoryBranchCommit(repositoryPath, branch)
    sendJson(response, 200, { branch, commit })
  } catch (error) {
    sendJson(response, 400, { error: toFriendlyError(error) })
  }
}

export async function handleMergeRequestStatus({ response, url, repositoryPath, projectId, deps }: GitLabRouteContext) {
  const iid = Number(url.searchParams.get('iid'))
  if (!Number.isInteger(iid) || iid < 1) {
    sendJson(response, 400, { error: 'Invalid merge request number' })
    return
  }
  try {
    const repository = await deps.loadSnapshot(repositoryPath)
    const credentials = await deps.resolveCredentials(projectId)
    const mergeRequest = await gitLabClientFor(credentials, deps.fetcher).getMergeRequest(
      gitLabProjectPath(repository.gitlabPath),
      iid,
    )
    sendJson(response, 200, {
      state: mergeRequest.state,
      webUrl: mergeRequest.webUrl,
    })
  } catch (error) {
    sendJson(response, 400, { error: toFriendlyError(error) })
  }
}

export async function handleUpload({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  try {
    const result = await deps.uploadAttachment(
      repositoryPath,
      projectId,
      await readUpload(request),
    )
    sendJson(response, 200, result)
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : 'Attachment upload failed',
    })
  }
}

export async function handlePull({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  try {
    const body = await readJson<{ confirmed: boolean }>(request)
    if (!body.confirmed) throw new Error('请先确认获取云端改动')
    const credentials = await deps.resolveCredentials(projectId)
    const result = deps.pull
      ? await deps.pull(repositoryPath)
      : await pullRepository(repositoryPath, remoteCredentials(credentials))
    deps.invalidateProject(repositoryPath)
    sendJson(response, 200, result)
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : '获取云端改动失败',
    })
  }
}

export async function handleBranchCreate({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  let body: { input: CreateBranchInput; confirmed: boolean }
  try {
    body = await readJson(request)
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request' })
    return
  }
  if (!body.confirmed) {
    sendJson(response, 400, { error: '请先确认创建分支' })
    return
  }
  try {
    const created = await deps.createBranch(repositoryPath, projectId, body.input)
    deps.invalidateProject(repositoryPath)
    sendJson(response, 200, created)
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : 'Branch creation failed',
    })
  }
}

export async function handleBranchCheckout({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  let body: { branch: string; confirmed: boolean }
  try {
    body = await readJson(request)
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request' })
    return
  }
  if (!body.confirmed || !body.branch?.trim()) {
    sendJson(response, 400, { error: '请先确认切换工作版本' })
    return
  }
  try {
    const switched = await deps.checkoutBranch(
      repositoryPath,
      projectId,
      body.branch.trim(),
    )
    deps.invalidateProject(repositoryPath)
    sendJson(response, 200, switched)
  } catch (error) {
    sendJson(response, 400, { error: toFriendlyError(error) })
  }
}

export async function handleBranchRefresh({ request, response, repositoryPath, projectId, deps }: GitLabRouteContext) {
  let body: { confirmed: boolean }
  try {
    body = await readJson(request)
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request' })
    return
  }
  if (!body.confirmed) {
    sendJson(response, 400, { error: '请先确认刷新云端分支' })
    return
  }
  try {
    let localRefreshError: unknown
    if (deps.refreshBranches) {
      try {
        await deps.refreshBranches(repositoryPath, projectId)
      } catch (error) {
        localRefreshError = error
      }
    } else {
      const credentials = await deps.resolveCredentials(projectId)
      try {
        await refreshRepositoryRemoteBranches(repositoryPath, remoteCredentials(credentials))
      } catch (error) {
        localRefreshError = error
      }
    }
    await pruneDeletedTrackedBranches(repositoryPath)
    deps.invalidateProject(repositoryPath)
    deps.markRemoteChecked(repositoryPath)
    const repository = await deps.loadSnapshot(repositoryPath, true)
    const credentials = await deps.resolveCredentials(projectId)
    const cloudBranches = await gitLabClientFor(credentials, deps.fetcher).listBranches(
      gitLabProjectPath(repository.gitlabPath),
    )
    sendJson(response, 200, {
      refreshed: true,
      branches: mergeCloudBranches(repository, cloudBranches),
      localRefreshError:
        localRefreshError instanceof Error ? localRefreshError.message : undefined,
    })
  } catch (error) {
    sendJson(response, 400, { error: toFriendlyError(error) })
  }
}

export async function handleSyncOrMergeRequest(
  { request, response, repositoryPath, projectId, url, deps }: GitLabRouteContext,
) {
  const isSync = url.pathname === '/api/gitlab/sync'
  let body:
    | { draft: GitLabSyncDraft; confirmed: boolean }
    | { draft: MergeRequestDraft; confirmed: boolean }
  try {
    body = await readJson(request)
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request' })
    return
  }

  try {
    const result = isSync
      ? await deps.sync(
          repositoryPath,
          projectId,
          body as { draft: GitLabSyncDraft; confirmed: boolean },
        )
      : await deps.createMergeRequest(
          repositoryPath,
          projectId,
          body as { draft: MergeRequestDraft; confirmed: boolean },
        )
    deps.invalidateProject(repositoryPath)
    sendJson(response, 200, result)
  } catch (error) {
    sendJson(response, 400, { error: toFriendlyError(error) })
  }
}
