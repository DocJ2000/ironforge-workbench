import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import Busboy from 'busboy'
import type { RepositorySnapshot } from '../src/domain/repository.js'
import type {
  GitLabSyncDraft,
  MergeRequestDraft,
} from '../src/domain/delivery.js'
import {
  previewCharge,
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
  createRepositoryBranch,
  pushRepositoryTag,
  type CreateBranchInput,
  pushRepositoryBranch,
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
  scan?: RepositoryScanner
  preview?: CommitPreviewer
  commit?: CommitExecutor
  sync?: GitLabSyncExecutor
  createMergeRequest?: MergeRequestExecutor
  createBranch?: BranchCreator
  uploadAttachment?: AttachmentUploader
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

export function gitLabProjectPath(remote: string) {
  const scpPath = remote.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?$/)?.[1]
  if (scpPath) return scpPath

  try {
    const url = new URL(remote)
    return url.pathname.replace(/^\/|\/$/g, '').replace(/\.git$/, '')
  } catch {
    return remote.replace(/\.git$/, '')
  }
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 64 * 1024) throw new Error('Request body too large')
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
  scan = scanRepository,
  preview = previewRepositoryCommit,
  commit = commitRepositoryChanges,
  sync,
  createMergeRequest,
  createBranch,
  uploadAttachment,
}: RepositoryMiddlewareOptions) {
  const workflowDependencies = () => {
    const gitLab = createGitLabClient(loadGitLabConfig())
    return {
      scanRepository,
      scanPackages: scanOutputPackages,
      previewCharge,
      writeCharge: writeChargeAtomically,
      previewCommit: previewRepositoryCommit,
      commit: commitRepositoryChanges,
      checkout: checkoutRepositoryBranch,
      push: pushRepositoryBranch,
      assertTagAvailable,
      createTag: createAnnotatedTag,
      pushTag: pushRepositoryTag,
      createMergeRequest: gitLab.createMergeRequest.bind(gitLab),
    }
  }
  const executeSync =
    sync ??
    ((operation) =>
      syncGitLab(repositoryPath, operation, workflowDependencies()))
  const executeMergeRequest =
    createMergeRequest ??
    ((operation) =>
      createDeliveryMergeRequest(
        repositoryPath,
        operation,
        workflowDependencies(),
      ))
  const executeCreateBranch =
    createBranch ??
    ((input) =>
      createRepositoryBranch(repositoryPath, input).then(() => ({
        branch: input.name.trim(),
      })))
  const executeUpload =
    uploadAttachment ??
    (async (upload) => {
      const repository = await scan(repositoryPath)
      const gitLab = createGitLabClient(loadGitLabConfig())
      return gitLab.uploadMarkdownFile(
        gitLabProjectPath(repository.gitlabPath),
        upload,
      )
    })

  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction,
  ) => {
    const path = request.url?.split('?')[0]
    const isRepositoryRequest = path === '/api/repository'
    const isDeliveryRequest = path === '/api/delivery'
    const isPreviewRequest = path === '/api/commit/preview'
    const isCommitRequest = path === '/api/commit'
    const isSyncRequest = path === '/api/gitlab/sync'
    const isMergeRequest = path === '/api/gitlab/merge-requests'
    const isBranchRequest = path === '/api/gitlab/branches'
    const isUploadRequest = path === '/api/gitlab/uploads'

    if (
      !isRepositoryRequest &&
      !isDeliveryRequest &&
      !isPreviewRequest &&
      !isCommitRequest &&
      !isSyncRequest &&
      !isMergeRequest &&
      !isBranchRequest &&
      !isUploadRequest
    ) {
      next()
      return
    }

    const expectedMethod =
      isRepositoryRequest || isDeliveryRequest ? 'GET' : 'POST'
    if (request.method !== expectedMethod) {
      sendJson(response, 405, { error: 'Method not allowed' })
      return
    }

    if (isUploadRequest) {
      try {
        const result = await executeUpload(await readUpload(request))
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Attachment upload failed',
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
        sendJson(response, 200, await executeCreateBranch(body.input))
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
              body as { draft: GitLabSyncDraft; confirmed: boolean },
            )
          : await executeMergeRequest(
              body as { draft: MergeRequestDraft; confirmed: boolean },
            )
        sendJson(response, 200, result)
      } catch (error) {
        sendJson(response, 400, {
          error:
            error instanceof Error ? error.message : 'GitLab operation failed',
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
          ? await preview(repositoryPath, body)
          : await commit(repositoryPath, body)
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
          scan(repositoryPath),
          scanOutputPackages(repositoryPath),
        ])
        try {
          const gitLab = createGitLabClient(loadGitLabConfig())
          const reviewers = await gitLab.listReviewers(
            gitLabProjectPath(repository.gitlabPath),
          )
          sendJson(response, 200, { packages, reviewers })
        } catch (error) {
          sendJson(response, 200, {
            packages,
            reviewers: [],
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
      const repository = await scan(repositoryPath)
      sendJson(response, 200, { source: 'live', repository })
    } catch {
      sendJson(response, 500, { error: 'Unable to read the local repository' })
    }
  }
}

export function repositoryApiPlugin(repositoryPath: string): Plugin {
  const middleware = createRepositoryMiddleware({ repositoryPath })
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
