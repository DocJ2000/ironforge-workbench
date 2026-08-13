import { describe, expect, it, vi } from 'vitest'
import type {
  DeliveryDraft,
  GitLabSyncDraft,
  MergeRequestDraft,
} from '../src/domain/delivery'
import {
  createDeliveryMergeRequest,
  composeMergeRequestDescription,
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
  assigneeIds: [7],
  reviewerIds: [42],
  feishuLinks: [],
  attachmentMarkdown: [],
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
      latestCommit: 'abc1234',
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
    captureCharge: vi.fn().mockResolvedValue({
      existed: true,
      contents: Buffer.from('[]\n'),
    }),
    restoreCharge: vi.fn().mockResolvedValue(undefined),
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
    assertTagAvailable: vi.fn().mockImplementation(async () => {
      order.push('tag-check')
    }),
    createTag: vi.fn().mockImplementation(async () => {
      order.push('tag-create')
    }),
    pushTag: vi.fn().mockImplementation(async () => {
      order.push('tag-push')
    }),
    ensureTag: vi.fn().mockImplementation(async () => {
      order.push('tag')
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

  it('restores charge.json when commit preparation fails', async () => {
    const deps = dependencies()
    vi.mocked(deps.previewCommit).mockRejectedValueOnce(
      new Error('preview failed'),
    )

    await expect(
      syncGitLab(
        'C:/fake-repository',
        { draft: syncDraft, confirmed: true },
        deps,
      ),
    ).rejects.toThrow('preview failed')

    expect(deps.restoreCharge).toHaveBeenCalledWith(
      'C:/fake-repository',
      expect.objectContaining({ existed: true }),
    )
    expect(deps.push).not.toHaveBeenCalled()
  })

  it('checks uniqueness before commit and pushes an optional version Tag', async () => {
    const order: string[] = []
    const deps = dependencies(order)
    const taggedDraft = {
      ...syncDraft,
      tag: { name: 'T2-v1', message: 'Dragon T2 第一个存档版本' },
    }

    const result = await syncGitLab(
      'C:/fake-repository',
      { draft: taggedDraft, confirmed: true },
      deps,
    )

    expect(order).toEqual([
      'tag-check',
      'checkout',
      'charge',
      'commit',
      'push',
      'tag-create',
      'tag-push',
    ])
    expect(deps.createTag).toHaveBeenCalledWith(
      'C:/fake-repository',
      taggedDraft.tag,
      'abc1234',
    )
    expect(result).toEqual({
      branch: 'dev/T2',
      commit: 'abc1234',
      tag: 'T2-v1',
    })
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
      assigneeIds: [7],
      reviewerIds: [42],
    })
    expect(result).toEqual({
      iid: 3,
      webUrl: 'https://gitlfs.lab.tp/project/-/merge_requests/3',
    })
  })

  it('ensures the version Tag before creating the merge request', async () => {
    const order: string[] = []
    const deps = dependencies(order)
    const tag = { name: 'T2-第二次打样', message: '供应商第二次打样版本' }

    await createDeliveryMergeRequest(
      'C:/fake-repository',
      { draft: { ...mergeRequestDraft, tag }, confirmed: true },
      deps,
    )

    expect(order).toEqual(['tag', 'mr'])
    expect(deps.ensureTag).toHaveBeenCalledWith(
      'C:/fake-repository',
      tag,
      'abc1234',
    )
  })
})

describe('composeMergeRequestDescription', () => {
  it('adds Feishu links and GitLab upload Markdown as separate sections', () => {
    const description = composeMergeRequestDescription({
      ...mergeRequestDraft,
      description: '## 改动说明\n更新结构图纸',
      feishuLinks: ['https://tinyphoton.feishu.cn/docx/example'],
      attachmentMarkdown: [
        '[评审资料.pdf](/uploads/example/评审资料.pdf)',
      ],
    })

    expect(description).toContain('## 飞书文档')
    expect(description).toContain('https://tinyphoton.feishu.cn/docx/example')
    expect(description).toContain('## 附件')
    expect(description).toContain('评审资料.pdf')
  })
})
