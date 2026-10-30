import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type {
  RepositorySnapshot,
} from '../src/domain/repository.js'
import type {
  GitLabSyncDraft,
  MergeRequestDraft,
} from '../src/domain/delivery.js'
import {
  captureChargeFile,
  previewCharge,
  restoreChargeFile,
  writeChargeAtomically,
} from './chargeGenerator.js'
import {
  createDeliveryMergeRequest,
  syncGitLab,
} from './deliveryWorkflow.js'
import {
  assertTagAvailable,
  checkoutRepositoryBranch,
  createAnnotatedTag,
  ensureRepositoryTag,
  pushRepositoryTag,
  pruneDeletedTrackedBranches,
  refreshRepositoryRemoteBranches,
  pushRepositoryBranch,
  type CreateBranchInput,
} from './gitBranchOperations.js'
import {
  commitRepositoryChanges,
  previewRepositoryCommit,
  type RepositoryCommitRequest,
} from './repositoryCommit.js'
import { createGitLabClient } from './gitlabClient.js'
import { loadForgeRoots } from './forgeConfig.js'
import { loadGitLabConfig } from './gitlabConfig.js'
import { scanOutputPackages } from './outputPackages.js'
import { scanRepository, scanRepositorySummary } from './repositoryScanner.js'
import { ProjectRegistry } from './projectRegistry.js'
import { cloneRepository } from './repositoryClone.js'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { checkConnection } from './connectionCheck.js'
import { probeCompanyNetwork } from './networkProbe.js'
import { toFriendlyError } from './friendlyError.js'
import { gitLabProjectPath } from './gitLabProjectPath.js'
import { mapWithConcurrency } from './asyncPool.js'
import { QueryCache } from './queryCache.js'
import { readJson, sendJson, type NextFunction } from './http.js'
import { handleProjectsRoute, handleProjectSummaries } from './routes/projects.js'
import {
  handleBranchCheckout,
  handleBranchCreate,
  handleBranchRefresh,
  handleMergeRequestStatus,
  handlePull,
  handleRetryPush,
  handleSyncOrMergeRequest,
  handleUpload,
  type GitLabRouteContext,
} from './routes/gitlab.js'

export { gitLabProjectPath } from './gitLabProjectPath.js'

type RepositoryScanner = (repositoryPath: string) => Promise<RepositorySnapshot>
type CommitPreviewer = (
  repositoryPath: string,
  request: RepositoryCommitRequest,
) => Promise<unknown>
type CommitExecutor = (
  repositoryPath: string,
  request: RepositoryCommitRequest,
) => Promise<unknown>
type GitLabSyncExecutor = (
  request: { draft: GitLabSyncDraft; confirmed: boolean },
) => Promise<unknown>
type MergeRequestExecutor = (
  request: { draft: MergeRequestDraft; confirmed: boolean },
) => Promise<unknown>
type BranchCreator = (input: CreateBranchInput) => Promise<unknown>
type BranchRefresher = (repositoryPath: string, projectId: string) => Promise<unknown>
type BranchCheckout = (repositoryPath: string, projectId: string, branch: string) => Promise<unknown>
type AttachmentUploader = (input: {
  name: string
  type: string
  bytes: Uint8Array
}) => Promise<{ markdown: string }>

interface RepositoryMiddlewareOptions {
  repositoryPath: string
  fetcher?: typeof fetch
  registry?: Pick<ProjectRegistry, 'list' | 'add' | 'remove' | 'resolve'>
  scan?: RepositoryScanner
  preview?: CommitPreviewer
  commit?: CommitExecutor
  sync?: GitLabSyncExecutor
  createMergeRequest?: MergeRequestExecutor
  createBranch?: BranchCreator
  refreshBranches?: BranchRefresher
  checkoutBranch?: BranchCheckout
  uploadAttachment?: AttachmentUploader
  pull?: (repositoryPath: string) => Promise<unknown>
  clone?: (input: {
    remoteUrl: string
    destination: string
  }, credentials: {
    sshKeyPath: string
    sshPassphrase?: string
    sshAskPassPath?: string
  }) => Promise<{ path: string }>
  credentials?: (projectId: string) => Promise<{
    baseUrl: string
    token: string
    sshKeyPath: string
    sshPassphrase?: string
    sshAskPassPath?: string
  }>
  sshAskPassPath?: string
}

export function createRepositoryMiddleware({
  repositoryPath,
  fetcher = fetch,
  registry,
  scan = scanRepository,
  preview = previewRepositoryCommit,
  commit = commitRepositoryChanges,
  sync,
  createMergeRequest,
  createBranch,
  refreshBranches,
  checkoutBranch,
  uploadAttachment,
  pull,
  clone,
  credentials,
  sshAskPassPath,
}: RepositoryMiddlewareOptions) {
  const resolveCredentials = async (projectId: string) => {
    if (credentials) return credentials(projectId)
    return {
      ...loadGitLabConfig(),
      sshKeyPath: process.env.GIT_SSH_KEY_PATH ?? '',
    }
  }
  // Several endpoints and pages read the same repository within one
  // interaction. Collapse those duplicate scans and GitLab reads; every write
  // below invalidates the project so a refresh right after an action is live.
  const snapshots = new QueryCache(1500)
  const summaries = new QueryCache(2000)
  const histories = new QueryCache(30_000)
  const remoteCheckedAt = new Map<string, number>()
  const remoteFreshMs = 60_000

  const loadSnapshot = (path: string, force = false) =>
    snapshots.read(path, () => scan(path), { force })

  const invalidateProject = (path: string) => {
    snapshots.invalidate(path)
    summaries.invalidate(path)
    histories.invalidate(path)
  }

  const remoteCredentialsFor = async (projectId: string) => {
    const projectCredentials = await resolveCredentials(projectId)
    return {
      sshKeyPath: projectCredentials.sshKeyPath,
      ...(projectCredentials.sshPassphrase
        ? { sshPassphrase: projectCredentials.sshPassphrase }
        : {}),
      ...(projectCredentials.sshAskPassPath
        ? { sshAskPassPath: projectCredentials.sshAskPassPath }
        : {}),
    }
  }

  /**
   * `git fetch` is the slowest part of reading a project and it was running on
   * every page load for every registered project. Throttle it per repository;
   * the explicit "刷新项目概况" action passes `refresh=1` to force a fetch.
   */
  const refreshRemoteBranches = async (
    path: string,
    projectId: string,
    force = false,
  ) => {
    const lastChecked = remoteCheckedAt.get(path) ?? 0
    if (!force && Date.now() - lastChecked < remoteFreshMs) return false
    remoteCheckedAt.set(path, Date.now())
    try {
      await refreshRepositoryRemoteBranches(path, await remoteCredentialsFor(projectId))
      await pruneDeletedTrackedBranches(path)
      return true
    } catch {
      // Reading the local snapshot must still work when fetch or pruning fails.
      return false
    }
  }
  const workflowDependencies = async (projectId: string) => {
    const projectCredentials = await resolveCredentials(projectId)
    const gitLab = createGitLabClient({
      baseUrl: projectCredentials.baseUrl,
      token: projectCredentials.token,
      recommendedReviewers: [],
    }, fetcher)
    const remoteCredentials = {
      sshKeyPath: projectCredentials.sshKeyPath,
      ...(projectCredentials.sshPassphrase
        ? { sshPassphrase: projectCredentials.sshPassphrase }
        : {}),
      ...(projectCredentials.sshAskPassPath
        ? { sshAskPassPath: projectCredentials.sshAskPassPath }
        : {}),
    }
    return {
      scanRepository,
      scanPackages: scanOutputPackages,
      previewCharge,
      writeCharge: writeChargeAtomically,
      captureCharge: captureChargeFile,
      restoreCharge: restoreChargeFile,
      previewCommit: previewRepositoryCommit,
      commit: commitRepositoryChanges,
      checkout: (path: string, branch: string) =>
        checkoutRepositoryBranch(path, branch, remoteCredentials),
      push: (path: string, branch: string) =>
        pushRepositoryBranch(path, branch, remoteCredentials),
      assertTagAvailable: (path: string, name: string) =>
        assertTagAvailable(path, name, remoteCredentials),
      createTag: createAnnotatedTag,
      pushTag: (path: string, name: string) =>
        pushRepositoryTag(path, name, remoteCredentials),
      ensureTag: (
        path: string,
        tag: { name: string; message: string },
        commit: string,
      ) => ensureRepositoryTag(path, tag, commit, remoteCredentials),
      createMergeRequest: gitLab.createMergeRequest.bind(gitLab),
    }
  }
  const executeSync = (
    path: string,
    projectId: string,
    operation: { draft: GitLabSyncDraft; confirmed: boolean },
  ) =>
    sync
      ? sync(operation)
      : workflowDependencies(projectId).then((dependencies) =>
          syncGitLab(path, operation, dependencies),
        )
  const executeMergeRequest = (
    path: string,
    projectId: string,
    operation: { draft: MergeRequestDraft; confirmed: boolean },
  ) =>
    createMergeRequest
      ? createMergeRequest(operation)
      : workflowDependencies(projectId).then((dependencies) =>
          createDeliveryMergeRequest(path, operation, dependencies),
        )
  const executeCreateBranch = async (
    path: string,
    projectId: string,
    input: CreateBranchInput,
  ) => {
    if (createBranch) return createBranch(input)
    const name = input.name.trim()
    if (!/^dev\/[A-Za-z0-9._+/-]+$/.test(name)) {
      throw new Error('只能创建 dev/ 开头的工作版本')
    }
    const repository = await scan(path)
    const projectCredentials = await resolveCredentials(projectId)
    const gitLab = createGitLabClient({
      baseUrl: projectCredentials.baseUrl,
      token: projectCredentials.token,
      recommendedReviewers: [],
    }, fetcher)
    return gitLab.createBranch(
      gitLabProjectPath(repository.gitlabPath),
      name,
      input.startPoint.trim(),
    )
  }
  const executeCheckoutBranch = async (
    path: string,
    projectId: string,
    branch: string,
  ) => {
    if (checkoutBranch) return checkoutBranch(path, projectId, branch)
    const projectCredentials = await resolveCredentials(projectId)
    await checkoutRepositoryBranch(path, branch, {
      sshKeyPath: projectCredentials.sshKeyPath,
      ...(projectCredentials.sshPassphrase ? { sshPassphrase: projectCredentials.sshPassphrase } : {}),
      ...(projectCredentials.sshAskPassPath ? { sshAskPassPath: projectCredentials.sshAskPassPath } : {}),
    })
    return { branch }
  }
  const executeUpload = (
    path: string,
    projectId: string,
    upload: { name: string; type: string; bytes: Uint8Array },
  ) =>
    uploadAttachment
      ? uploadAttachment(upload)
      : (async () => {
      const repository = await scan(path)
      const projectCredentials = await resolveCredentials(projectId)
      const gitLab = createGitLabClient({
        baseUrl: projectCredentials.baseUrl,
        token: projectCredentials.token,
        recommendedReviewers: [],
      }, fetcher)
      return gitLab.uploadMarkdownFile(
        gitLabProjectPath(repository.gitlabPath),
        upload,
      )
    })()

  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction,
  ) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost')
    const path = requestUrl.pathname
    const isProjectsRequest = path === '/api/projects'
    const isProjectSummariesRequest = path === '/api/projects/summaries'
    const isRepositoryRequest = path === '/api/repository'
    const isDeliveryRequest = path === '/api/delivery'
    const isPreviewRequest = path === '/api/commit/preview'
    const isCommitRequest = path === '/api/commit'
    const isSyncRequest = path === '/api/gitlab/sync'
    const isRetryPushRequest = path === '/api/gitlab/retry-push'
    const isMergeRequest = path === '/api/gitlab/merge-requests'
    const isMergeRequestStatus = path === '/api/gitlab/merge-request-status'
    const isBranchRequest = path === '/api/gitlab/branches'
    const isBranchCheckoutRequest = path === '/api/gitlab/branches/checkout'
    const isBranchRefreshRequest = path === '/api/gitlab/branches/refresh'
    const isUploadRequest = path === '/api/gitlab/uploads'
    const isPullRequest = path === '/api/gitlab/pull'
  const isCloneRequest = path === '/api/gitlab/clone'
    const isConnectionRequest = path === '/api/connection/check'
    const isHistoryRequest = path === '/api/gitlab/history'

    if (
      !isProjectsRequest &&
      !isProjectSummariesRequest &&
      !isRepositoryRequest &&
      !isDeliveryRequest &&
      !isPreviewRequest &&
      !isCommitRequest &&
      !isSyncRequest &&
      !isRetryPushRequest &&
      !isMergeRequest &&
      !isMergeRequestStatus &&
      !isBranchRequest &&
      !isBranchCheckoutRequest &&
      !isBranchRefreshRequest &&
      !isUploadRequest
      && !isPullRequest
      && !isCloneRequest
      && !isConnectionRequest
      && !isHistoryRequest
    ) {
      next()
      return
    }

    if (isProjectSummariesRequest) {
      await handleProjectSummaries({
        request,
        response,
        registry,
        repositoryPath,
        loadSummary: async (path, projectId, refresh) => {
          if (refresh) await refreshRemoteBranches(path, projectId, true)
          return summaries.read(path, () => scanRepositorySummary(path), { force: refresh })
        },
      })
      return
    }

    if (isProjectsRequest) {
      await handleProjectsRoute({ request, response, registry, repositoryPath })
      return
    }

    if (isCloneRequest) {
      try {
        const body = await readJson<{
          input: { remoteUrl: string; destination: string }
          confirmed: boolean
        }>(request)
        if (!body.confirmed) throw new Error('请先确认下载云端项目')
        const computerCredentials = await resolveCredentials('computer')
        const remoteCredentials = {
          sshKeyPath: computerCredentials.sshKeyPath,
          ...(computerCredentials.sshPassphrase ? { sshPassphrase: computerCredentials.sshPassphrase } : {}),
          ...(computerCredentials.sshAskPassPath
            ? { sshAskPassPath: computerCredentials.sshAskPassPath }
            : sshAskPassPath ? { sshAskPassPath } : {}),
        }
        const cloned = clone
          ? await clone(body.input, remoteCredentials)
          : await cloneRepository({ ...body.input, credentials: remoteCredentials })
        const project = registry ? await registry.add(cloned.path, true) : cloned
        invalidateProject(cloned.path)
        sendJson(response, 201, { project })
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : '下载云端项目失败',
        })
      }
      return
    }

    const expectedMethod =
      isRepositoryRequest || isDeliveryRequest || isConnectionRequest || isHistoryRequest || isMergeRequestStatus ? 'GET' : 'POST'
    if (request.method !== expectedMethod) {
      sendJson(response, 405, { error: 'Method not allowed' })
      return
    }

    if (isConnectionRequest) {
      try {
        const projectCredentials = await resolveCredentials('computer')
        const gitLab = createGitLabClient({
          baseUrl: projectCredentials.baseUrl,
          token: projectCredentials.token,
          recommendedReviewers: [],
        }, fetcher)
        const result = await checkConnection(
          repositoryPath,
          projectCredentials,
          {
            probeServer: probeCompanyNetwork,
            probeApi: async () => gitLab.currentUser(),
            probeSsh: async () => {
              const publicKey = await readFile(
                `${projectCredentials.sshKeyPath}.pub`,
                'utf8',
              )
              if (!(await gitLab.currentUserHasSshKey(publicKey))) {
                throw new Error('identity public key is not registered in GitLab')
              }
            },
          },
        )
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, { error: toFriendlyError(error) })
      }
      return
    }

    let activeRepositoryPath = repositoryPath
    let activeProjectId = 'default'
    if (registry) {
      try {
        const projectId = requestUrl.searchParams.get('projectId')
        const project = projectId
          ? await registry.resolve(projectId)
          : (await registry.list())[0]
        if (!project) throw new Error('没有已登记的项目')
        activeRepositoryPath = project.path
        activeProjectId = project.id
      } catch (error) {
        sendJson(response, 404, {
          error: error instanceof Error ? error.message : '项目不存在',
        })
        return
      }
    }

    // Route context for the GitLab write/read handlers in routes/gitlab.ts.
    const gitlabContext = (): GitLabRouteContext => ({
      request,
      response,
      url: requestUrl,
      repositoryPath: activeRepositoryPath,
      projectId: activeProjectId,
      deps: {
        resolveCredentials,
        fetcher,
        loadSnapshot,
        invalidateProject,
        markRemoteChecked: (path) => remoteCheckedAt.set(path, Date.now()),
        sync: (path, projectId, operation) => executeSync(path, projectId, operation),
        createMergeRequest: (path, projectId, operation) => executeMergeRequest(path, projectId, operation),
        createBranch: (path, projectId, input) => executeCreateBranch(path, projectId, input),
        checkoutBranch: (path, projectId, branch) => executeCheckoutBranch(path, projectId, branch),
        refreshBranches: refreshBranches
          ? (path, projectId) => refreshBranches(path, projectId)
          : undefined,
        uploadAttachment: (path, projectId, upload) => executeUpload(path, projectId, upload),
        pull,
      },
    })

    if (isRetryPushRequest) {
      await handleRetryPush(gitlabContext())
      return
    }


    if (isMergeRequestStatus) {
      await handleMergeRequestStatus(gitlabContext())
      return
    }


    if (isUploadRequest) {
      await handleUpload(gitlabContext())
      return
    }


    if (isHistoryRequest) {
      try {
        // Reading history used to run one GitLab request per cloud branch on
        // every page visit. Cache the assembled timeline briefly, let the
        // explicit refresh button bypass it, and keep the branch fan-out small.
        const force = requestUrl.searchParams.get('refresh') === '1'
        const history = await histories.read(
          activeRepositoryPath,
          async () => {
            const projectCredentials = await resolveCredentials('computer')
            const repository = await loadSnapshot(activeRepositoryPath)
            const gitLab = createGitLabClient({
              baseUrl: projectCredentials.baseUrl,
              token: projectCredentials.token,
              recommendedReviewers: [],
            }, fetcher)
            const cloudBranches = repository.branches
              .filter((branch) => branch.remote)
              .map((branch) => branch.name)
            const branchNames = cloudBranches.length
              ? cloudBranches
              : [repository.branch]
            const branchCommits = await mapWithConcurrency(
              branchNames,
              3,
              async (branch) => ({
                branch,
                commits: await gitLab.listCommits(
                  gitLabProjectPath(repository.gitlabPath),
                  100,
                  branch,
                ),
              }),
            )
            const commitsById = new Map<string, {
              commit: (typeof branchCommits)[number]['commits'][number]
              branches: string[]
            }>()
            for (const entry of branchCommits) {
              for (const commit of entry.commits) {
                const existing = commitsById.get(commit.id)
                if (existing) existing.branches.push(entry.branch)
                else commitsById.set(commit.id, { commit, branches: [entry.branch] })
              }
            }
            const commits = [...commitsById.values()]
              .sort((left, right) =>
                Date.parse(right.commit.committedAt) - Date.parse(left.commit.committedAt))
              .slice(0, 200)
            const [tags, mergedRequests] = await Promise.all([
              gitLab.listTags(gitLabProjectPath(repository.gitlabPath)).catch(() => []),
              gitLab.listMergedRequests(gitLabProjectPath(repository.gitlabPath)).catch(() => []),
            ])
            const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', {
              hour12: false,
            })
            return [
              ...commits.map(({ commit, branches }) => ({
                id: commit.id,
                type: 'commit' as const,
                title: commit.title,
                description: commit.message.trim() || commit.title,
                actor: commit.authorName,
                timestamp: formatTime(commit.committedAt),
                reference: commit.shortId,
                tone: 'info' as const,
                branches,
                sortAt: commit.committedAt,
              })),
              ...tags.map((tag) => ({
                id: `tag:${tag.name}`,
                type: 'tag' as const,
                title: `版本标记 ${tag.name}`,
                description: tag.message || '关键版本标记',
                actor: 'GitLab',
                timestamp: formatTime(tag.committedAt),
                reference: tag.name,
                tone: 'warning' as const,
                sortAt: tag.committedAt,
              })),
              ...mergedRequests.map((mergeRequest) => ({
                id: `merge:${mergeRequest.iid}`,
                type: 'merge' as const,
                title: mergeRequest.title,
                description: `${mergeRequest.sourceBranch} 已合并到 ${mergeRequest.targetBranch}`,
                actor: mergeRequest.mergedBy,
                timestamp: formatTime(mergeRequest.mergedAt),
                reference: `审核单 #${mergeRequest.iid}`,
                tone: 'success' as const,
                branches: [mergeRequest.sourceBranch, mergeRequest.targetBranch],
                sortAt: mergeRequest.mergedAt,
              })),
            ]
              .sort((left, right) => Date.parse(right.sortAt) - Date.parse(left.sortAt))
              .slice(0, 200)
              .map(({ sortAt: _sortAt, ...event }) => event)
          },
          { force },
        )
        sendJson(response, 200, { history })
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : '无法读取 GitLab 历史',
        })
      }
      return
    }

    if (isPullRequest) {
      await handlePull(gitlabContext())
      return
    }


    if (isBranchRequest) {
      await handleBranchCreate(gitlabContext())
      return
    }


    if (isBranchCheckoutRequest) {
      await handleBranchCheckout(gitlabContext())
      return
    }


    if (isBranchRefreshRequest) {
      await handleBranchRefresh(gitlabContext())
      return
    }


    if (isSyncRequest || isMergeRequest) {
      await handleSyncOrMergeRequest(gitlabContext())
      return
    }


    if (isPreviewRequest || isCommitRequest) {
      let body: RepositoryCommitRequest
      try {
        body = await readJson<RepositoryCommitRequest>(request)
      } catch {
        sendJson(response, 400, { error: 'Invalid JSON request' })
        return
      }

      try {
        const result = isPreviewRequest
          ? await preview(activeRepositoryPath, body)
          : await commit(activeRepositoryPath, body)
        if (!isPreviewRequest) invalidateProject(activeRepositoryPath)
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Commit operation failed',
        })
      }
      return
    }

    if (isDeliveryRequest) {
      try {
        const [repository, packages, forgeRoots] = await Promise.all([
          loadSnapshot(activeRepositoryPath),
          scanOutputPackages(activeRepositoryPath),
          loadForgeRoots(activeRepositoryPath),
        ])
        const configuredRoots = forgeRoots?.map(({ title, relativePath }) => ({
          title,
          root: relativePath,
        }))
        // The upload wizard only needs the package list. Asking GitLab for
        // reviewers and visibility there cost two extra requests per visit and
        // failed whenever the access code was not configured yet.
        if (requestUrl.searchParams.get('scope') === 'packages') {
          sendJson(response, 200, {
            packages,
            reviewers: [],
            projectVisibility: 'unknown',
            forgeRoots: configuredRoots,
          })
          return
        }
        try {
          const projectCredentials = await resolveCredentials(activeProjectId)
          const gitLab = createGitLabClient({
            baseUrl: projectCredentials.baseUrl,
            token: projectCredentials.token,
            recommendedReviewers: [],
          }, fetcher)
          const projectPath = gitLabProjectPath(repository.gitlabPath)
          const [reviewers, projectVisibility] = await Promise.all([
            gitLab.listReviewers(projectPath),
            gitLab.getProjectVisibility(projectPath),
          ])
          sendJson(response, 200, { packages, reviewers, projectVisibility, forgeRoots: configuredRoots })
        } catch (error) {
          sendJson(response, 200, {
            packages,
            reviewers: [],
            projectVisibility: 'unknown',
            forgeRoots: configuredRoots,
            reviewerError:
              error instanceof Error
                ? error.message
                : '无法读取 GitLab 审核人',
          })
        }
      } catch {
        sendJson(response, 500, { error: '无法读取交付概览' })
      }
      return
    }

    try {
      await refreshRemoteBranches(
        activeRepositoryPath,
        activeProjectId,
        requestUrl.searchParams.get('refresh') === '1',
      )
      const repository = await loadSnapshot(activeRepositoryPath)
      sendJson(response, 200, { source: 'live', repository })
    } catch {
      sendJson(response, 500, { error: 'Unable to read the local repository' })
    }
  }
}

export function repositoryApiPlugin(repositoryPath: string): Plugin {
  const registry = new ProjectRegistry(
    process.env.IRONFORGE_PROJECT_REGISTRY ??
      join(homedir(), '.ironforge-workbench', 'projects.json'),
    repositoryPath,
  )
  const middleware = createRepositoryMiddleware({ repositoryPath, registry })
  const register = (middlewares: {
    use: (
      handler: (
        request: IncomingMessage,
        response: ServerResponse,
        next: NextFunction,
      ) => void,
    ) => void
  }) => {
    middlewares.use((request, response, next) => {
      void middleware(request, response, next)
    })
  }

  return {
    name: 'ironforge-local-repository-api',
    configureServer(server) {
      register(server.middlewares)
    },
    configurePreviewServer(server) {
      register(server.middlewares)
    },
  }
}
