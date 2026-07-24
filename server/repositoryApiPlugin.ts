import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { RepositorySnapshot } from '../src/domain/repository.js'
import { scanRepository } from './repositoryScanner.js'

type NextFunction = (error?: unknown) => void
type RepositoryScanner = (repositoryPath: string) => Promise<RepositorySnapshot>

interface RepositoryMiddlewareOptions {
  repositoryPath: string
  scan?: RepositoryScanner
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

export function createRepositoryMiddleware({
  repositoryPath,
  scan = scanRepository,
}: RepositoryMiddlewareOptions) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction,
  ) => {
    if (request.url?.split('?')[0] !== '/api/repository') {
      next()
      return
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' })
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
