import { describe, expect, it, vi } from 'vitest'
import type { DeliveryDraft } from '../src/domain/delivery'
import {
  executeDelivery,
  previewDelivery,
  type DeliveryWorkflowDependencies,
} from './deliveryWorkflow'

const draft: DeliveryDraft = {
  message: '提交所有的BOM交付包',
  changePaths: ['output/mechanical/五金件/导轴.pdf'],
  confirmedDeletions: [],
  selectedPackageIds: ['output/mechanical/五金件'],
  reviewerIds: [42],
  targetBranch: 'main',
  mrTitle: '提交所有的BOM交付包',
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
      message: draft.message,
      paths: [...draft.changePaths, 'charge.json'],
      deletedCadPaths: [],
    }),
    commit: vi.fn().mockImplementation(async () => {
      order.push('commit')
      return { branch: 'dev/T2', commit: 'abc1234', paths: [] }
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

    const preview = await previewDelivery('C:/fake-repository', draft, deps)

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

describe('executeDelivery', () => {
  it('requires an explicit final confirmation', async () => {
    await expect(
      executeDelivery(
        'C:/fake-repository',
        { draft, confirmed: false },
        dependencies(),
      ),
    ).rejects.toThrow('请先确认 GitLab 同步操作')
  })

  it('writes, commits, pushes, then creates the MR with the sync comment', async () => {
    const order: string[] = []
    const deps = dependencies(order)

    const result = await executeDelivery(
      'C:/fake-repository',
      { draft, confirmed: true },
      deps,
    )

    expect(order).toEqual(['charge', 'commit', 'push', 'mr'])
    expect(deps.createMergeRequest).toHaveBeenCalledWith({
      projectPath: 'rockteam/dragon/optics/lens-mechanics',
      sourceBranch: 'dev/T2',
      targetBranch: 'main',
      title: draft.mrTitle,
      description: `同步注释：${draft.message}`,
      reviewerIds: [42],
    })
    expect(result).toMatchObject({
      branch: 'dev/T2',
      commit: 'abc1234',
      mergeRequestIid: 3,
    })
  })
})
