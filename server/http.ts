import type { IncomingMessage, ServerResponse } from 'node:http'
import Busboy from 'busboy'

export type NextFunction = (error?: unknown) => void

export function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

export async function readJson<T>(request: IncomingMessage): Promise<T> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 4 * 1024 * 1024) throw new Error('Request body too large')
  }
  return JSON.parse(body) as T
}

export async function readUpload(request: IncomingMessage) {
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
