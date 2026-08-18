// @vitest-environment node

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
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

function jsonRequest(url: string, value: unknown) {
  const request = Readable.from([JSON.stringify(value)]) as IncomingMessage
  request.method = 'POST'
  request.url = url
  return request
}

describe('createRepositoryMiddleware', () => {
  it('uses computer credentials for downloads without accepting secrets from the page', async () => {
    const clone = vi.fn().mockResolvedValue({ path: 'C:\\downloaded' })
    const credentials = vi.fn().mockResolvedValue({
      baseUrl: 'https://gitlfs.lab.tp',
      token: 'stored-token',
      sshKeyPath: 'C:\\keys\\id_ed25519',
      sshPassphrase: 'stored-passphrase',
    })
    const registry = {
      list: vi.fn(),
      add: vi.fn().mockResolvedValue({ id: 'downloaded', path: 'C:\\downloaded' }),
      remove: vi.fn(),
      resolve: vi.fn(),
    }
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\legacy',
      registry,
      clone,
      credentials,
    })
    const result = responseDouble()
    await middleware(
      jsonRequest('/api/gitlab/clone', {
        input: {
          remoteUrl: 'git@gitlfs.lab.tp:rockteam/project.git',
          destination: 'C:\\downloaded',
        },
        confirmed: true,
      }),
      result.response,
      vi.fn(),
    )

    expect(credentials).toHaveBeenCalledWith('computer')
    expect(clone).toHaveBeenCalledWith(
      {
        remoteUrl: 'git@gitlfs.lab.tp:rockteam/project.git',
        destination: 'C:\\downloaded',
      },
      expect.objectContaining({
        sshKeyPath: 'C:\\keys\\id_ed25519',
        sshPassphrase: 'stored-passphrase',
      }),
    )
  })

  it('lists registered projects and rejects unknown project IDs before scanning', async () => {
    const scan = vi.fn()
    const registry = {
      list: vi.fn().mockResolvedValue([
        { id: 'project-a', path: 'C:\\a', name: 'a', gitlabRemote: '', addedAt: '' },
      ]),
      add: vi.fn(),
      remove: vi.fn(),
      resolve: vi.fn().mockRejectedValue(new Error('项目不存在或尚未登记')),
    }
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\legacy',
      registry,
      scan,
    })
    const listResponse = responseDouble()
    const unknownResponse = responseDouble()

    await middleware(
      { method: 'GET', url: '/api/projects' } as IncomingMessage,
      listResponse.response,
      vi.fn(),
    )
    await middleware(
      {
        method: 'GET',
        url: '/api/repository?projectId=project-unknown',
      } as IncomingMessage,
      unknownResponse.response,
      vi.fn(),
    )

    expect(JSON.parse(listResponse.body()).projects[0].id).toBe('project-a')
    expect(unknownResponse.response.statusCode).toBe(404)
    expect(scan).not.toHaveBeenCalled()
  })

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

  it('still returns a live repository snapshot when remote pruning fails', async () => {
    const scan = vi.fn().mockResolvedValue(getDemoRepository())
    const credentials = vi.fn().mockResolvedValue({
      baseUrl: 'https://gitlfs.lab.tp',
      token: 'stored-token',
      sshKeyPath: 'C:\\keys\\id_ed25519',
    })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan,
      credentials,
    })
    const result = responseDouble()

    await middleware(
      { method: 'GET', url: '/api/repository' } as IncomingMessage,
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(200)
    expect(scan).toHaveBeenCalledWith('C:\\repository')
    expect(credentials).toHaveBeenCalledWith('default')
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

  it('previews and executes a commit through separate endpoints', async () => {
    const preview = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      message: '更新零件',
      paths: ['part.prt'],
      deletedCadPaths: [],
    })
    const commit = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      commit: 'abc1234',
      paths: ['part.prt'],
    })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      preview,
      commit,
    })
    const requestBody = {
      message: '更新零件',
      paths: ['part.prt'],
      confirmedDeletions: [],
    }
    const previewResponse = responseDouble()
    const commitResponse = responseDouble()

    await middleware(
      jsonRequest('/api/commit/preview', requestBody),
      previewResponse.response,
      vi.fn(),
    )
    await middleware(
      jsonRequest('/api/commit', requestBody),
      commitResponse.response,
      vi.fn(),
    )

    expect(preview).toHaveBeenCalledWith('C:\\repository', requestBody)
    expect(commit).toHaveBeenCalledWith('C:\\repository', requestBody)
    expect(JSON.parse(previewResponse.body())).toMatchObject({ branch: 'dev/T2' })
    expect(JSON.parse(commitResponse.body())).toMatchObject({ commit: 'abc1234' })
  })

  it('rejects invalid commit JSON', async () => {
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
    })
    const request = Readable.from(['{']) as IncomingMessage
    request.method = 'POST'
    request.url = '/api/commit/preview'
    const result = responseDouble()

    await middleware(request, result.response, vi.fn())

    expect(result.response.statusCode).toBe(400)
    expect(JSON.parse(result.body())).toEqual({ error: 'Invalid JSON request' })
  })

  it('keeps GitLab sync and MR creation as separate operations', async () => {
    const sync = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      commit: 'abc1234',
    })
    const createMergeRequest = vi.fn().mockResolvedValue({
      iid: 7,
      webUrl: 'https://gitlfs.lab.tp/project/-/merge_requests/7',
    })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      sync,
      createMergeRequest,
    })
    const syncBody = {
      confirmed: true,
      draft: {
        message: '同步 BOM 交付包',
        changePaths: ['output/part.pdf'],
        confirmedDeletions: [],
        selectedPackageIds: ['output/mechanical'],
        branch: 'dev/T2',
      },
    }
    const mrBody = {
      confirmed: true,
      draft: {
        sourceBranch: 'dev/T2',
        targetBranch: 'main',
        title: '同步 BOM 交付包',
        description: '同步注释：同步 BOM 交付包',
        assigneeIds: [7],
        reviewerIds: [42],
        feishuLinks: [],
        attachmentMarkdown: [],
      },
    }
    const syncResponse = responseDouble()
    const mrResponse = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/sync', syncBody),
      syncResponse.response,
      vi.fn(),
    )
    await middleware(
      jsonRequest('/api/gitlab/merge-requests', mrBody),
      mrResponse.response,
      vi.fn(),
    )

    expect(sync).toHaveBeenCalledWith(syncBody)
    expect(createMergeRequest).toHaveBeenCalledWith(mrBody)
    expect(JSON.parse(syncResponse.body())).toEqual({
      branch: 'dev/T2',
      commit: 'abc1234',
    })
    expect(JSON.parse(mrResponse.body())).toMatchObject({ iid: 7 })
  })

  it('accepts a large GitLab sync request for a whole-project upload', async () => {
    const sync = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      commit: 'abc1234',
    })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      sync,
    })
    const body = {
      confirmed: true,
      draft: {
        message: '优化路径问题，缩短了文件夹与文件名称',
        changePaths: Array.from(
          { length: 473 },
          (_, index) => `source/Dragon的Demo设计/${'主摄结构路径/'.repeat(20)}第${index}个设计文件.SLDPRT`,
        ),
        confirmedDeletions: [],
        selectedPackageIds: ['output/mechanical/3D打印治具'],
        branch: 'dev/T2',
      },
    }
    const result = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/sync', body),
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(200)
    expect(sync).toHaveBeenCalledWith(body)
  })

  it('creates a local branch through a confirmed endpoint', async () => {
    const createBranch = vi.fn().mockResolvedValue({ branch: 'dev/T3' })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      createBranch,
    })
    const body = {
      confirmed: true,
      input: { name: 'dev/T3', startPoint: 'dev/T2' },
    }
    const result = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/branches', body),
      result.response,
      vi.fn(),
    )

    expect(createBranch).toHaveBeenCalledWith(body.input)
    expect(JSON.parse(result.body())).toEqual({ branch: 'dev/T3' })
  })

  it('checks out a selected branch through a confirmed endpoint', async () => {
    const checkoutBranch = vi.fn().mockResolvedValue({ branch: 'dev/T3' })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      checkoutBranch,
    })
    const result = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/branches/checkout', {
        confirmed: true,
        branch: 'dev/T3',
      }),
      result.response,
      vi.fn(),
    )

    expect(checkoutBranch).toHaveBeenCalledWith(
      'C:\\repository',
      'default',
      'dev/T3',
    )
    expect(JSON.parse(result.body())).toEqual({ branch: 'dev/T3' })
  })

  it('refreshes remote branch refs before listing upload targets', async () => {
    const refreshBranches = vi.fn().mockResolvedValue({ refreshed: true })
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      name: 'dev/V5',
      commit: {
        id: 'abc123456789',
        short_id: 'abc12345',
        title: 'create V5',
        committed_date: '2026-08-13T10:00:00Z',
      },
    }]), { headers: { 'Content-Type': 'application/json' } }))
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn().mockResolvedValue(getDemoRepository()),
      refreshBranches,
      fetcher,
      credentials: vi.fn().mockResolvedValue({
        baseUrl: 'https://gitlfs.lab.tp',
        token: 'stored-token',
        sshKeyPath: 'C:\\keys\\id_ed25519',
      }),
    })
    const result = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/branches/refresh', { confirmed: true }),
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(200)
    expect(JSON.parse(result.body())).toEqual(expect.objectContaining({
      refreshed: true,
      branches: expect.arrayContaining([
        expect.objectContaining({ name: 'dev/V5', remote: true }),
      ]),
    }))
    expect(refreshBranches).toHaveBeenCalledWith('C:\\repository', 'default')
  })

  it('keeps listing cloud branches even when local fetch fails', async () => {
    const refreshBranches = vi.fn().mockRejectedValue(new Error('ssh failed'))
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      name: 'dev/V5',
      commit: {
        id: 'abc123456789',
        short_id: 'abc12345',
        title: 'create V5',
        committed_date: '2026-08-13T10:00:00Z',
      },
    }]), { headers: { 'Content-Type': 'application/json' } }))
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn().mockResolvedValue(getDemoRepository()),
      refreshBranches,
      fetcher,
      credentials: vi.fn().mockResolvedValue({
        baseUrl: 'https://gitlfs.lab.tp',
        token: 'stored-token',
        sshKeyPath: 'C:\\keys\\id_ed25519',
      }),
    })
    const result = responseDouble()

    await middleware(
      jsonRequest('/api/gitlab/branches/refresh', { confirmed: true }),
      result.response,
      vi.fn(),
    )

    expect(result.response.statusCode).toBe(200)
    expect(JSON.parse(result.body())).toEqual(expect.objectContaining({
      refreshed: true,
      localRefreshError: 'ssh failed',
      branches: expect.arrayContaining([
        expect.objectContaining({ name: 'dev/V5' }),
      ]),
    }))
  })

  it('uploads one PDF through a separate multipart endpoint', async () => {
    const uploadAttachment = vi.fn().mockResolvedValue({
      markdown: '[资料.pdf](/uploads/example/资料.pdf)',
    })
    const middleware = createRepositoryMiddleware({
      repositoryPath: 'C:\\repository',
      scan: vi.fn(),
      uploadAttachment,
    })
    const boundary = 'ironforge-test-boundary'
    const payload = Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="资料.pdf"\r\n' +
        'Content-Type: application/pdf\r\n\r\n' +
        'PDF\r\n' +
        `--${boundary}--\r\n`,
    )
    const request = Readable.from([payload]) as IncomingMessage
    request.method = 'POST'
    request.url = '/api/gitlab/uploads'
    request.headers = {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(payload.length),
    }
    const result = responseDouble()

    await middleware(request, result.response, vi.fn())

    expect(uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '资料.pdf',
        type: 'application/pdf',
      }),
    )
    expect(JSON.parse(result.body())).toEqual({
      markdown: '[资料.pdf](/uploads/example/资料.pdf)',
    })
  })
})
