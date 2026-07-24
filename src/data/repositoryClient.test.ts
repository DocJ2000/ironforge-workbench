import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from './demoRepository'
import { fetchRepositorySnapshot } from './repositoryClient'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRepositorySnapshot', () => {
  it('returns a live repository payload', async () => {
    const repository = getDemoRepository()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ source: 'live', repository }),
      }),
    )

    await expect(fetchRepositorySnapshot()).resolves.toEqual({
      source: 'live',
      repository,
    })
  })

  it('rejects an unavailable repository API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(fetchRepositorySnapshot()).rejects.toThrow('本地仓库读取失败')
  })
})
