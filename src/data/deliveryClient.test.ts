import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeliveryDraft } from '../domain/delivery'
import { deliveryApi } from './deliveryClient'

const draft: DeliveryDraft = {
  message: '同步注释',
  changePaths: ['charge.json'],
  confirmedDeletions: [],
  selectedPackageIds: [],
  reviewerIds: [42],
  targetBranch: 'main',
  mrTitle: '同步 BOM',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('deliveryApi', () => {
  it('sends explicit confirmation only to the execute endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          commit: 'abc1234',
          branch: 'dev/T2',
          mergeRequestIid: 3,
          mergeRequestUrl: 'https://gitlfs.lab.tp/mr/3',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetcher)

    await deliveryApi.execute(draft)

    expect(fetcher).toHaveBeenCalledWith(
      '/api/delivery/execute',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ draft, confirmed: true }),
      }),
    )
  })

  it('surfaces the backend action message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: '请先选择审核人' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(deliveryApi.preview(draft)).rejects.toThrow('请先选择审核人')
  })

  it('separates GitLab synchronization from MR creation', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: 'abc1234', branch: 'dev/T2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ iid: 3, webUrl: 'https://gitlab/mr/3' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetcher)

    await deliveryApi.syncGitLab({
      message: '同步图纸',
      changePaths: ['charge.json'],
      confirmedDeletions: [],
      selectedPackageIds: [],
      branch: 'dev/T2',
    })
    await deliveryApi.createMergeRequest({
      sourceBranch: 'dev/T2',
      targetBranch: 'main',
      title: '同步图纸',
      description: '',
      reviewerIds: [42],
      feishuLinks: [],
      attachmentMarkdown: [],
    })

    expect(fetcher.mock.calls[0][0]).toBe('/api/gitlab/sync')
    expect(fetcher.mock.calls[1][0]).toBe('/api/gitlab/merge-requests')
  })

  it('creates a branch through its own confirmed endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ branch: 'dev/T3' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    await deliveryApi.createBranch({
      name: 'dev/T3',
      startPoint: 'dev/T2',
    })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/gitlab/branches',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          input: { name: 'dev/T3', startPoint: 'dev/T2' },
          confirmed: true,
        }),
      }),
    )
  })

  it('confirms retrieval from the selected project endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        branch: 'dev/T2',
        updated: true,
        receivedCommits: 2,
        commit: 'abc1234',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetcher)

    await deliveryApi.pull()

    expect(fetcher).toHaveBeenCalledWith(
      '/api/gitlab/pull',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      }),
    )
  })

  it('uploads an attachment as multipart form data', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markdown: '[资料.pdf](/uploads/example/资料.pdf)',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetcher)
    const file = new File(['PDF'], '资料.pdf', {
      type: 'application/pdf',
    })

    await deliveryApi.uploadAttachment(file)

    expect(fetcher.mock.calls[0][0]).toBe('/api/gitlab/uploads')
    expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(FormData)
    expect(fetcher.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
    })
  })
})
