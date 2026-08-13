import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import Busboy from 'busboy'
import type { RepositorySnapshot } from '../src/domain/repository.js'
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
  createAndPublishRepositoryBranch,
  createAnnotatedTag,
  ensureRepositoryTag,
  pushRepositoryTag,
  type CreateBranchInput,
  pushRepositoryBranch,
  repositoryBranchCommit,
  validateRetryPushBranch,
} from './gitBranchOperations.js'
import {
  commitRepositoryChanges,
  previewRepositoryCommit,
  type RepositoryCommitRequest,
} from './repositoryCommit.js'
import { createGitLabClient } from './gitlabClient.js'
import { loadGitLabConfig } from './gitlabConfig.js'
import { scanOutputPackages } from './outputPackages.js'
import { scanRepository } from './repositoryScanner.js'
import { ProjectRegistry } from './projectRegistry.js'
import { pullRepository } from './repositoryPull.js'
import { cloneRepository } from './repositoryClone.js'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { checkConnection } from './connectionCheck.js'
import { probeCompanyNetwork } from './networkProbe.js'
import { toFriendlyError } from './friendlyError.js'
import { gitLabProjectPath } from './gitLabProjectPath.js'

export { gitLabProjectPath } from './gitLabProjectPath.js'

type NextFunction = (error?: unknown) => void
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

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 4 * 1024 * 1024) throw new Error('Request body too large')
  }
  return JSON.parse(body) as T
}

async function readUpload(request: IncomingMessage) {
  const contentType = request.headers['content-type']
  if (!contentType?.startsWith('multipart/form-data')) {
    throw new Error('附件请求格式不正确')
  }
  return new Promise<{ name: string; type: string; bytes: Uint8Array }>(
    (resolve, reject) => {
      const parser = Busboy({
        headers: request.headers,
        limits: { files: 1, fileSize: 20 * 1024 * 1024 },
      })
      let upload:
        | { name: string; type: string; chunks: Buffer[] }
        | undefined
      parser.on('file', (_field, stream, info) => {
        upload = {
          name: Buffer.from(info.filename, 'latin1').toString('utf8'),
          type: info.mimeType,
          chunks: [],
        }
        stream.on('data', (chunk: Buffer) => upload?.chunks.push(chunk))
        stream.on('limit', () => reject(new Error('附件不能超过 20 MB')))
      })
      parser.on('error', reject)
      parser.on('finish', () => {
        if (!upload) {
          reject(new Error('请选择附件'))
          return
        }
        const extension = upload.name.toLowerCase().match(/\.[^.]+$/)?.[0]
        if (!['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(extension ?? '')) {
          reject(new Error('只支持 PDF、PNG、JPEG 和 WebP 附件'))
          return
        }
        resolve({
          name: upload.name,
          type: upload.type,
          bytes: Buffer.concat(upload.chunks),
        })
      })
      request.pipe(parser)
    },
  )
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
      checkout: checkoutRepositoryBranch,
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
    const projectCredentials = await resolveCredentials(projectId)
    return createAndPublishRepositoryBranch(path, input, {
      sshKeyPath: projectCredentials.sshKeyPath,
      ...(projectCredentials.sshPassphrase
        ? { sshPassphrase: projectCredentials.sshPassphrase }
        : {}),
      ...(projectCredentials.sshAskPassPath
        ? { sshAskPassPath: projectCredentials.sshAskPassPath }
        : sshAskPassPath
          ? { sshAskPassPath }
          : {}),
    })
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
    const isRepositoryRequest = path === '/api/repository'
    const isDeliveryRequest = path === '/api/delivery'
    const isPreviewRequest = path === '/api/commit/preview'
    const isCommitRequest = path === '/api/commit'
    const isSyncRequest = path === '/api/gitlab/sync'
    const isRetryPushRequest = path === '/api/gitlab/retry-push'
    const isMergeRequest = path === '/api/gitlab/merge-requests'
    const isMergeRequestStatus = path === '/api/gitlab/merge-request-status'
    const isBranchRequest = path === '/api/gitlab/branches'
    const isUploadRequest = path === '/api/gitlab/uploads'
    const isPullRequest = path === '/api/gitlab/pull'
  const isCloneRequest = path === '/api/gitlab/clone'
    const isConnectionRequest = path === '/api/connection/check'
    const isHistoryRequest = path === '/api/gitlab/history'

    if (
      !isProjectsRequest &&
      !isRepositoryRequest &&
      !isDeliveryRequest &&
      !isPreviewRequest &&
      !isCommitRequest &&
      !isSyncRequest &&
      !isRetryPushRequest &&
      !isMergeRequest &&
      !isMergeRequestStatus &&
      !isBranchRequest &&
      !isUploadRequest
      && !isPullRequest
      && !isCloneRequest
      && !isConnectionRequest
      && !isHistoryRequest
    ) {
      next()
      return
    }

    if (isProjectsRequest) {
      if (!registry) {
        sendJson(response, 200, {
          projects: [{ id: 'default', path: repositoryPath }],
        })
        return
      }
      try {
        if (request.method === 'GET') {
          sendJson(response, 200, { projects: await registry.list() })
          return
        }
        if (request.method === 'POST') {
          const body = await readJson<{ path: string }>(request)
          sendJson(response, 201, { project: await registry.add(body.path) })
          return
        }
        if (request.method === 'DELETE') {
          const body = await readJson<{ id: string; deleteLocalFiles?: boolean }>(request)
          sendJson(response, 200, {
            project: await registry.remove(body.id, body.deleteLocalFiles === true),
          })
          return
        }
        sendJson(response, 405, { error: 'Method not allowed' })
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : '项目操作失败',
        })
      }
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

    if (isRetryPushRequest) {
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
        const projectCredentials = await resolveCredentials(activeProjectId)
        await pushRepositoryBranch(activeRepositoryPath, branch, {
          sshKeyPath: projectCredentials.sshKeyPath,
          ...(projectCredentials.sshPassphrase ? { sshPassphrase: projectCredentials.sshPassphrase } : {}),
          ...(projectCredentials.sshAskPassPath ? { sshAskPassPath: projectCredentials.sshAskPassPath } : {}),
        })
        const commit = await repositoryBranchCommit(
          activeRepositoryPath,
          branch,
        )
        sendJson(response, 200, { branch, commit })
      } catch (error) {
        sendJson(response, 400, { error: toFriendlyError(error) })
      }
      return
    }

    if (isMergeRequestStatus) {
      const iid = Number(requestUrl.searchParams.get('iid'))
      if (!Number.isInteger(iid) || iid < 1) {
        sendJson(response, 400, { error: 'Invalid merge request number' })
        return
      }
      try {
        const repository = await scan(activeRepositoryPath)
        const projectCredentials = await resolveCredentials(activeProjectId)
        const gitLab = createGitLabClient({
          baseUrl: projectCredentials.baseUrl,
          token: projectCredentials.token,
          recommendedReviewers: [],
        }, fetcher)
        const mergeRequest = await gitLab.getMergeRequest(
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
      return
    }

    if (isUploadRequest) {
      try {
        const result = await executeUpload(
          activeRepositoryPath,
          activeProjectId,
          await readUpload(request),
        )
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Attachment upload failed',
        })
      }
      return
    }

    if (isHistoryRequest) {
      try {
        const projectCredentials = await resolveCredentials('computer')
        const repository = await scan(activeRepositoryPath)
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
        const branchCommits = await Promise.all(
          branchNames.map(async (branch) => ({
            branch,
            commits: await gitLab.listCommits(
              gitLabProjectPath(repository.gitlabPath),
              100,
              branch,
            ),
          })),
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
        const history = [
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
        sendJson(response, 200, {
          history,
        })
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : '无法读取 GitLab 历史',
        })
      }
      return
    }

    if (isPullRequest) {
      try {
        const body = await readJson<{ confirmed: boolean }>(request)
        if (!body.confirmed) throw new Error('请先确认获取云端改动')
        const projectCredentials = await resolveCredentials(activeProjectId)
        const result = pull
          ? await pull(activeRepositoryPath)
          : await pullRepository(activeRepositoryPath, {
              sshKeyPath: projectCredentials.sshKeyPath,
              ...(projectCredentials.sshPassphrase
                ? { sshPassphrase: projectCredentials.sshPassphrase }
                : {}),
              ...(projectCredentials.sshAskPassPath
                ? { sshAskPassPath: projectCredentials.sshAskPassPath }
                : {}),
            })
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : '获取云端改动失败',
        })
      }
      return
    }

    if (isBranchRequest) {
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
        sendJson(
          response,
          200,
          await executeCreateBranch(
            activeRepositoryPath,
            activeProjectId,
            body.input,
          ),
        )
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Branch creation failed',
        })
      }
      return
    }

    if (isSyncRequest || isMergeRequest) {
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
        const result = isSyncRequest
          ? await executeSync(
              activeRepositoryPath,
              activeProjectId,
              body as { draft: GitLabSyncDraft; confirmed: boolean },
            )
          : await executeMergeRequest(
              activeRepositoryPath,
              activeProjectId,
              body as { draft: MergeRequestDraft; confirmed: boolean },
            )
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error: toFriendlyError(error),
        })
      }
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
        const [repository, packages] = await Promise.all([
          scan(activeRepositoryPath),
          scanOutputPackages(activeRepositoryPath),
        ])
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
          sendJson(response, 200, { packages, reviewers, projectVisibility })
        } catch (error) {
          sendJson(response, 200, {
            packages,
            reviewers: [],
            projectVisibility: 'unknown',
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
      const repository = await scan(activeRepositoryPath)
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
