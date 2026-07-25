import { describe, expect, it, vi } from 'vitest'
import type {
  DeliveryDraft,
  GitLabSyncDraft,
  MergeRequestDraft,
} from '../src/domain/delivery'
import {
  createDeliveryMergeRequest,
  previewDelivery,
  syncGitLab,
  type DeliveryWorkflowDependencies,
} from './deliveryWorkflow'

const syncDraft: GitLabSyncDraft = {
  message: '提交所有的 BOM 交付包',
  changePaths: ['output/mechanical/五金件/导轴.pdf'],
  confirmedDeletions: [],
  selectedPackageIds: ['output/mechanical/五金件'],
  branch: 'dev/T2',
}

const mergeRequestDraft: MergeRequestDraft = {
  sourceBranch: 'dev/T2',
  targetBranch: 'main',
  title: '提交所有的 BOM 交付包',
  description: '同步注释：提交所有的 BOM 交付包',
  reviewerIds: [42],
}

const legacyDraft: DeliveryDraft = {
  ...syncDraft,
  reviewerIds: mergeRequestDraft.reviewerIds,
  targetBranch: mergeRequestDraft.targetBranch,
  mrTitle: mergeRequestDraft.title,
}

function dependencies(order: string[] = []): DeliveryWorkflowDependencies {
  const packages = [
    {
      id: 'output/mechanical/五金件',
      name: '五金件',
      path: 'output/mechanical/五金件',
      domain: 'mechanical',
      files: [],
    },
  ]

  return {
    scanRepository: vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      gitlabPath: 'rockteam/dragon/optics/lens-mechanics',
    }),
    scanPackages: vi.fn().mockResolvedValue(packages),
    previewCharge: vi.fn().mockResolvedValue({
      before: [],
      after: [{ name: '五金件', path: 'output/mechanical/五金件' }],
      changed: true,
      serialized: '[]\n',
    }),
    writeCharge: vi.fn().mockImplementation(async () => {
      order.push('charge')
    }),
    previewCommit: vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      message: syncDraft.message,
      paths: [...syncDraft.changePaths, 'charge.json'],
      deletedCadPaths: [],
    }),
    commit: vi.fn().mockImplementation(async () => {
      order.push('commit')
      return { branch: 'dev/T2', commit: 'abc1234', paths: [] }
    }),
    checkout: vi.fn().mockImplementation(async () => {
      order.push('checkout')
    }),
    push: vi.fn().mockImplementation(async () => {
      order.push('push')
    }),
    createMergeRequest: vi.fn().mockImplementation(async () => {
      order.push('mr')
      return {
        iid: 3,
        webUrl: 'https://gitlfs.lab.tp/project/-/merge_requests/3',
      }
    }),
  }
}

describe('previewDelivery', () => {
  it('does not write charge or execute Git operations', async () => {
    const deps = dependencies()

    const preview = await previewDelivery(
      'C:/fake-repository',
      legacyDraft,
      deps,
    )

    expect(preview).toMatchObject({
      branch: 'dev/T2',
      chargeChanged: true,
      selectedPackages: [{ name: '五金件' }],
    })
    expect(deps.writeCharge).not.toHaveBeenCalled()
    expect(deps.commit).not.toHaveBeenCalled()
    expect(deps.push).not.toHaveBeenCalled()
    expect(deps.createMergeRequest).not.toHaveBeenCalled()
  })
})

describe('syncGitLab', () => {
  it('requires confirmation and does not require a reviewer', async () => {
    await expect(
      syncGitLab(
        'C:/fake-repository',
        { draft: syncDraft, confirmed: false },
        dependencies(),
      ),
    ).rejects.toThrow('请先确认同步到 GitLab')
  })

  it('checks out the selected branch, commits, and pushes without creating MR', async () => {
    const order: string[] = []
    const deps = dependencies(order)

    const result = await syncGitLab(
      'C:/fake-repository',
      { draft: syncDraft, confirmed: true },
      deps,
    )

    expect(order).toEqual(['checkout', 'charge', 'commit', 'push'])
    expect(deps.checkout).toHaveBeenCalledWith(
      'C:/fake-repository',
      'dev/T2',
    )
    expect(deps.push).toHaveBeenCalledWith('C:/fake-repository', 'dev/T2')
    expect(deps.createMergeRequest).not.toHaveBeenCalled()
    expect(result).toEqual({ branch: 'dev/T2', commit: 'abc1234' })
  })
})

describe('createDeliveryMergeRequest', () => {
  it('requires a reviewer and creates MR without another commit or push', async () => {
    const order: string[] = []
    const deps = dependencies(order)

    await expect(
      createDeliveryMergeRequest(
        'C:/fake-repository',
        {
          confirmed: true,
          draft: { ...mergeRequestDraft, reviewerIds: [] },
        },
        deps,
      ),
    ).rejects.toThrow('至少选择一位审核人')

    const result = await createDeliveryMergeRequest(
      'C:/fake-repository',
      { draft: mergeRequestDraft, confirmed: true },
      deps,
    )

    expect(order).toEqual(['mr'])
    expect(deps.commit).not.toHaveBeenCalled()
    expect(deps.push).not.toHaveBeenCalled()
    expect(deps.createMergeRequest).toHaveBeenCalledWith({
      projectPath: 'rockteam/dragon/optics/lens-mechanics',
      sourceBranch: 'dev/T2',
      targetBranch: 'main',
      title: '提交所有的 BOM 交付包',
      description: '同步注释：提交所有的 BOM 交付包',
      reviewerIds: [42],
    })
    expect(result).toEqual({
      iid: 3,
      webUrl: 'https://gitlfs.lab.tp/project/-/merge_requests/3',
    })
  })
})
