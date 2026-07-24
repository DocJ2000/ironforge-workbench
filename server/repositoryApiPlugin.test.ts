// @vitest-environment node

import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../src/data/demoRepository'
import { createRepositoryMiddleware } from './repositoryApiPlugin'

function responseDouble() {
  const headers = new Map<string, string>()
  let body = ''
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value)
    },
    end(value = '') {
      body += value
    },
  } as unknown as ServerResponse

  return {
    response,
    headers,
    body: () => body,
  }
}

describe('createRepositoryMiddleware', () => {
  it('returns a live repository snapshot without caching', async () => {
    const scan = vi.fn().mockResolvedValue(getDemoRepository())
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan,
    })
    const result = responseDouble()

    await middleware(
      { method: 'GET', url: '/api/repository' } as IncomingMessage,
      result.response,
      vi.fn(),
    )

    expect(scan).toHaveBeenCalledWith('C:\\repository')
    expect(result.headers.get('cache-control')).toBe('no-store')
    expect(JSON.parse(result.body())).toMatchObject({
      source: 'live',
      repository: { branch: 'dev/T2' },
    })
  })

  it('rejects non-GET requests', async () => {
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
    })
    const result = responseDouble()

    await middleware(
      { method: 'POST', url: '/api/repository' } as IncomingMessage,
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(405)
    expect(JSON.parse(result.body())).toEqual({ error: 'Method not allowed' })
  })

  it('returns a structured scanner error', async () => {
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\missing',
      scan: vi.fn().mockRejectedValue(new Error('not a repository')),
    })
    const result = responseDouble()

    await middleware(
      { method: 'GET', url: '/api/repository' } as IncomingMessage,
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(500)
    expect(JSON.parse(result.body())).toEqual({
      error: 'Unable to read the local repository',
    })
  })
})
