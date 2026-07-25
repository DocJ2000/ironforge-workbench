import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { RepositorySnapshot } from '../src/domain/repository.js'
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

interface RepositoryMiddlewareOptions {
  repositoryPath: string
  scan?: RepositoryScanner
  preview?: CommitPreviewer
  commit?: CommitExecutor
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

async function readJson(request: IncomingMessage): Promise<RepositoryCommitRequest> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 64 * 1024) throw new Error('Request body too large')
  }
  return JSON.parse(body) as RepositoryCommitRequest
}

export function createRepositoryMiddleware({
  repositoryPath,
  scan = scanRepository,
  preview = previewRepositoryCommit,
  commit = commitRepositoryChanges,
}: RepositoryMiddlewareOptions) {
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

    if (
      !isRepositoryRequest &&
      !isDeliveryRequest &&
      !isPreviewRequest &&
      !isCommitRequest
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

    if (isPreviewRequest || isCommitRequest) {
      let body: RepositoryCommitRequest
      try {
        body = await readJson(request)
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
