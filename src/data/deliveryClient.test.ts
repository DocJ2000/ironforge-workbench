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

  it('sends a separate Ironforge publication comment', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jobId: 'job-1', packageCount: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    await deliveryApi.publish({
      mergeRequestIid: 3,
      packageIds: ['package-a', 'package-b'],
      comment: '发布采购交付包',
    })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/ironforge/publish',
      expect.objectContaining({
        body: JSON.stringify({
          draft: {
            mergeRequestIid: 3,
            packageIds: ['package-a', 'package-b'],
            comment: '发布采购交付包',
          },
          confirmed: true,
        }),
      }),
    )
  })
})
