import { describe, expect, it } from 'vitest'
import { validateDeliveryDraft } from './delivery'

describe('validateDeliveryDraft', () => {
  it('requires changes, a commit message, an MR title, and a reviewer', () => {
    expect(
      validateDeliveryDraft({
        message: '',
        changePaths: [],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [],
        targetBranch: 'main',
        mrTitle: '',
      }),
    ).toEqual([
      '没有需要提交的文件',
      '请填写本次改动说明',
      '请填写 MR 标题',
      '至少选择一位审核人',
    ])
  })

  it('allows GitLab-only synchronization with no output package', () => {
    expect(
      validateDeliveryDraft({
        message: '更新结构设计',
        changePaths: ['source/part.prt'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [23],
        targetBranch: 'main',
        mrTitle: '更新结构设计',
      }),
    ).toEqual([])
  })

  it('rejects an empty target branch', () => {
    expect(
      validateDeliveryDraft({
        message: '更新结构设计',
        changePaths: ['source/part.prt'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [23],
        targetBranch: ' ',
        mrTitle: '更新结构设计',
      }),
    ).toContain('请选择目标分支')
  })
})
