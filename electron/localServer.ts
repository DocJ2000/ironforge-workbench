import { readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, relative, resolve } from 'node:path'

type NextFunction = (error?: unknown) => void
type Middleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: NextFunction,
) => void

interface LocalServerOptions {
  staticRoot: string
  middleware: Middleware
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

async function serveStatic(
  staticRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
) {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const candidate = resolve(staticRoot, `.${pathname}`)
  const insideRoot = relative(resolve(staticRoot), candidate)
  const file =
    insideRoot.startsWith('..') || insideRoot.includes(':')
      ? null
      : (await stat(candidate).catch(() => null))?.isFile()
        ? candidate
        : resolve(staticRoot, 'index.html')
  if (!file) {
    response.statusCode = 404
    response.end('Not found')
    return
  }
  const body = await readFile(file)
  response.statusCode = 200
  response.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream')
  response.setHeader('Cache-Control', file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000')
  response.end(body)
}

export async function startLocalServer({ staticRoot, middleware }: LocalServerOptions) {
  const server = createServer((request, response) => {
    middleware(request, response, (error) => {
      if (error) {
        response.statusCode = 500
        response.end('Local service error')
        return
      }
      void serveStatic(staticRoot, request, response).catch(() => {
        response.statusCode = 500
        response.end('Local service error')
      })
    })
  })
  await new Promise<void>((resolveReady, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveReady)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('无法启动本地服务')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolveClosed, reject) =>
        server.close((error) => (error ? reject(error) : resolveClosed())),
      ),
  }
}
